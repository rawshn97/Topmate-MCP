import type { Page } from "playwright";
import { config } from "../config.js";
import { selectors } from "./selectors.js";
import { withPage } from "./browser.js";
import { getService, invalidateProfileCache, listServices } from "./apiClient.js";
import type {
  ActionResult,
  ServiceInput,
  UpdateServiceInput,
  UpdateProfileInput,
} from "../types.js";

async function waitForServicePatch(page: Page): Promise<void> {
  await page
    .waitForResponse(
      (res) =>
        res.url().includes("/service/") &&
        ["PATCH", "PUT"].includes(res.request().method()),
      { timeout: 10_000 }
    )
    .catch(() => null);
}

/**
 * Clicks every visible "Save" button on the edit form, one at a time, until
 * none remain. Each of the form's sections (title/short description/price,
 * duration, rich-text description) only renders its own Save button once a
 * field in that section is dirtied, and saves independently — so this is
 * simpler and more robust than tracking which section owns which button.
 */
async function saveAllDirtySections(page: Page): Promise<void> {
  const saveButton = page.locator(selectors.editForm.saveButton);
  for (let i = 0; i < 6; i++) {
    const button = saveButton.first();
    if (!(await button.isVisible().catch(() => false))) break;
    await Promise.all([waitForServicePatch(page), button.click()]);
    await page.waitForTimeout(400);
  }
}

/**
 * Fills the question modal's text input. Ant's "Edit Question" modal
 * briefly repopulates the field from React state right after it mounts —
 * filling immediately can get silently clobbered by that repopulation — so
 * this waits for the input to be visible, fills, and re-fills once more if
 * a readback shows the value didn't stick.
 */
async function fillModalQuestionInput(page: Page, modal: ReturnType<Page["locator"]>, value: string): Promise<void> {
  const q = selectors.questions;
  const input = modal.locator(q.modalQuestionInput).first();
  await input.waitFor({ state: "visible", timeout: 5_000 });
  await input.fill(value);
  await page.waitForTimeout(300);
  if ((await input.inputValue()) !== value) {
    await input.fill(value);
  }
}

/**
 * Replaces a service's invitee questions to match `questions` exactly:
 * edits existing question slots in place, deletes extras if `questions` is
 * shorter than what's there, and adds new ones if it's longer. Existing and
 * new questions share one modal (see selectors.questions).
 */
async function replaceQuestions(page: Page, questions: string[]): Promise<void> {
  const q = selectors.questions;
  const editButton = page.locator(q.editQuestionButton);
  const existingCount = await editButton.count();

  const editCount = Math.min(existingCount, questions.length);
  for (let i = 0; i < editCount; i++) {
    await editButton.nth(i).click();
    const modal = page.locator(q.modal).last();
    await fillModalQuestionInput(page, modal, questions[i]);
    await Promise.all([
      page
        .waitForResponse((res) => res.url().includes("service-questions"), {
          timeout: 10_000,
        })
        .catch(() => null),
      modal.locator(q.editSubmitButton).click(),
    ]);
    await page.waitForTimeout(400);
  }

  // Delete from the end so earlier indices stay stable as the list shrinks.
  for (let i = existingCount - 1; i >= questions.length; i--) {
    await editButton.nth(i).click();
    const modal = page.locator(q.modal).last();
    await modal.locator(q.deleteButton).waitFor({ state: "visible", timeout: 5_000 });
    await Promise.all([
      page
        .waitForResponse((res) => res.url().includes("service-questions"), {
          timeout: 10_000,
        })
        .catch(() => null),
      modal.locator(q.deleteButton).click(),
    ]);
    await page.waitForTimeout(400);
  }

  for (let i = existingCount; i < questions.length; i++) {
    await page.locator(q.addQuestionButton).click();
    const modal = page.locator(q.modal).last();
    await fillModalQuestionInput(page, modal, questions[i]);
    await Promise.all([
      page
        .waitForResponse((res) => res.url().includes("service-questions"), {
          timeout: 10_000,
        })
        .catch(() => null),
      modal.locator(q.addSubmitButton).click(),
    ]);
    await page.waitForTimeout(400);
  }
}

/**
 * Fills whichever fields are provided on the edit-style form (the create
 * flow's step 2 and the update flow share this exact screen), saves every
 * section that ended up dirty, and — if `questions` was provided — replaces
 * the question list to match it.
 */
async function fillEditForm(page: Page, fields: Partial<ServiceInput>): Promise<void> {
  const f = selectors.editForm;

  if (fields.title !== undefined) {
    await page.locator(f.titleInput).fill(fields.title);
  }
  if (fields.price !== undefined) {
    await page.locator(f.priceInput).fill(String(fields.price));
  }
  if (fields.durationMinutes !== undefined) {
    await page.locator(f.durationInput).fill(String(fields.durationMinutes));
  }
  if (fields.description !== undefined) {
    const editor = page.locator(f.descriptionEditor);
    await editor.click();
    // Quill is a contenteditable, not an input — Ctrl+A there only selects
    // within the current block in some states, leaving old content behind.
    // selectText() reliably selects the whole element's content instead.
    await editor.selectText();
    await page.keyboard.press("Backspace");
    await page.keyboard.type(fields.description);
  }

  await saveAllDirtySections(page);

  if (fields.questions !== undefined) {
    await replaceQuestions(page, fields.questions);
  }
}

/**
 * Creates a new service by driving the real "Add service" flow in the
 * Topmate dashboard. Expects fully-drafted, final content — the caller
 * (typically Claude, in conversation with you) is responsible for turning
 * rough details into a polished title/description/questions before this
 * runs.
 */
export async function createService(input: ServiceInput): Promise<ActionResult> {
  try {
    const result = await withPage(async (page) => {
      await page.goto(`${config.baseUrl}${selectors.servicesList.dashboardUrl}`, {
        waitUntil: "domcontentloaded",
      });
      await page.locator(selectors.servicesList.addServiceButton).first().click();
      await page.waitForURL(/\/dashboard\/services\/add/i, { timeout: 10_000 });

      const c = selectors.createForm;
      await page.locator(c.titleInput).fill(input.title);
      await page.locator(c.durationInput).fill(String(input.durationMinutes ?? 30));
      await page.locator(c.chargeInput).fill(String(input.price ?? 0));

      await page.locator(c.nextButton).click();
      await page
        .locator(selectors.editForm.successToast)
        .first()
        .waitFor({ timeout: 15_000 });

      // The creation step lands on the edit screen for the new service —
      // its id is expected in the URL's `id` query param. Fall back to
      // matching by title (unique enough for a freshly-drafted service) if
      // that param isn't there, in case Topmate changes the redirect shape.
      let newId = new URL(page.url()).searchParams.get("id") ?? undefined;
      if (!newId) {
        invalidateProfileCache();
        const services = await listServices();
        newId = services.find((s) => s.title === input.title)?.id;
      }
      if (!newId) {
        throw new Error(
          "Service was created but its id could not be determined — check the dashboard manually."
        );
      }

      await fillEditForm(page, {
        description: input.description,
        questions: input.questions,
      });

      return {
        success: true,
        message: `Created service "${input.title}".`,
        serviceId: newId,
      };
    });
    invalidateProfileCache();
    return result;
  } catch (err) {
    return {
      success: false,
      message: `Failed to create service "${input.title}": ${(err as Error).message}`,
      screenshotPath: (err as Error & { screenshotPath?: string }).screenshotPath,
    };
  }
}

/**
 * Updates an existing service. Looks it up by id via the API first (needed
 * for its `type`, which the edit page's URL requires), then edits only the
 * fields provided.
 */
export async function updateService(input: UpdateServiceInput): Promise<ActionResult> {
  try {
    const current = await getService(input.serviceId);

    const result = await withPage(async (page) => {
      await page.goto(
        `${config.baseUrl}${selectors.editForm.editUrl(input.serviceId, current.type ?? 1)}`,
        { waitUntil: "domcontentloaded" }
      );

      await fillEditForm(page, {
        title: input.title,
        description: input.description,
        price: input.price,
        durationMinutes: input.durationMinutes,
        questions: input.questions,
      });

      return {
        success: true,
        message: `Updated service "${input.title ?? current.title}".`,
        serviceId: input.serviceId,
      };
    });
    invalidateProfileCache();
    return result;
  } catch (err) {
    return {
      success: false,
      message: `Failed to update service ${input.serviceId}: ${(err as Error).message}`,
      screenshotPath: (err as Error & { screenshotPath?: string }).screenshotPath,
    };
  }
}

/**
 * Deletes a service. Requires the caller to have already confirmed intent —
 * this function does not ask again, it just executes.
 */
export async function deleteService(serviceId: string): Promise<ActionResult> {
  try {
    const current = await getService(serviceId);

    const result = await withPage(async (page) => {
      await page.goto(
        `${config.baseUrl}${selectors.editForm.editUrl(serviceId, current.type ?? 1)}`,
        { waitUntil: "domcontentloaded" }
      );
      await page.locator(selectors.serviceActions.deleteServiceButton).click();
      const confirmButton = page.locator(selectors.serviceActions.confirmDeleteButton);
      await confirmButton.first().waitFor({ timeout: 5_000 });
      await Promise.all([
        page
          .waitForResponse(
            (res) => res.url().includes("/service/") && res.request().method() === "DELETE",
            { timeout: 15_000 }
          )
          .catch(() => null),
        confirmButton.first().click(),
      ]);

      return {
        success: true,
        message: `Deleted service "${current.title}".`,
        serviceId,
      };
    });
    invalidateProfileCache();
    return result;
  } catch (err) {
    return {
      success: false,
      message: `Failed to delete service ${serviceId}: ${(err as Error).message}`,
      screenshotPath: (err as Error & { screenshotPath?: string }).screenshotPath,
    };
  }
}

/**
 * Replaces a service's intake questions. Implemented as a thin wrapper over
 * updateService, which already handles the question-replacement logic via
 * fillEditForm/replaceQuestions.
 */
export async function updateQuestions(
  serviceId: string,
  questions: string[]
): Promise<ActionResult> {
  return updateService({ serviceId, questions });
}

/**
 * Updates the creator's own profile title (tagline) and/or description
 * (bio). Unlike services there's no list/lookup step — Topmate has exactly
 * one profile per logged-in account, so this goes straight to the settings
 * page and edits whichever fields were provided.
 *
 * NOT YET VERIFIED — see selectors.ts's profileForm comment. The real editor
 * is a visual page builder (bio text renders inside an embedded iframe of
 * the live public profile), not the plain form this currently assumes; it
 * needs a HEADLESS=false walkthrough before this will reliably work.
 */
export async function updateProfile(input: UpdateProfileInput): Promise<ActionResult> {
  try {
    const result = await withPage(async (page) => {
      await page.goto(`${config.baseUrl}${selectors.profileForm.dashboardUrl}`, {
        waitUntil: "domcontentloaded",
      });

      const f = selectors.profileForm;
      if (input.title !== undefined) {
        await page.locator(f.titleInput).first().fill(input.title);
      }
      if (input.description !== undefined) {
        await page.locator(f.descriptionInput).first().fill(input.description);
      }

      await page.locator(f.saveButton).first().click();
      await page.locator(f.successToast).first().waitFor({ timeout: 15_000 });

      return {
        success: true,
        message: "Updated profile.",
      };
    });
    invalidateProfileCache();
    return result;
  } catch (err) {
    return {
      success: false,
      message: `Failed to update profile: ${(err as Error).message}`,
      screenshotPath: (err as Error & { screenshotPath?: string }).screenshotPath,
    };
  }
}
