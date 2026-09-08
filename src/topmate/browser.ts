import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";
import { selectors } from "./selectors.js";

function storageStateExists(): boolean {
  return fs.existsSync(config.storageStatePath);
}

async function ensureLoggedIn(page: Page): Promise<void> {
  await page.goto(`${config.baseUrl}${selectors.servicesList.dashboardUrl}`, {
    waitUntil: "domcontentloaded",
  });

  // Topmate's own app redirects an unauthenticated visitor from /dashboard/*
  // to /sign-in?redirect_to=... — verified against a live account. That
  // redirect is a more reliable "am I logged in?" signal than guessing at a
  // marker element's selector, and it's a client-side (SPA) redirect, so give
  // it a beat to actually happen before checking the URL.
  await page.waitForURL(/sign-in/i, { timeout: 3_000 }).catch(() => {});
  const alreadyLoggedIn = !/sign-in/i.test(page.url());

  if (alreadyLoggedIn) return;

  // Not logged in (or the saved session expired) — run the real sign-in
  // flow. Topmate has no password field: entering your email and submitting
  // sends a one-time code to your inbox, and the dashboard only loads once
  // that OTP is entered on the page — there's no way to script that part
  // without reading your email, so it has to be done by hand.
  await page.goto(`${config.baseUrl}${selectors.login.signInUrl}`, {
    waitUntil: "domcontentloaded",
  });
  await page.locator(selectors.login.emailInput).first().fill(config.email());
  await page.locator(selectors.login.submitButton).first().click();

  // With HEADLESS=false, this is your window to open the OTP email and type
  // the code into the visible browser: it renders as 6 separate single-digit
  // boxes, submitted with a button whose exact text is "Login" (verified
  // live). With HEADLESS=true there's no one to do that, so this just fails
  // fast instead of waiting pointlessly.
  await page
    .waitForURL(/dashboard/i, { timeout: config.headless ? 15_000 : 120_000 })
    .catch(() => {
      throw new Error(
        config.headless
          ? "Login requires a one-time code emailed to you — Topmate has no password login. Set HEADLESS=false in .env and re-run so you can enter the code by hand once; the session will then be reused from storage-state.json."
          : "Timed out waiting for login to complete. Check the browser window for an OTP prompt and enter the code from your email."
      );
    });
}

/**
 * Launches a browser, gets a logged-in page, runs `fn`, persists the
 * (possibly refreshed) session for next time, and always cleans up —
 * saving a screenshot on failure so a broken selector is easy to diagnose.
 */
export async function withPage<T>(
  fn: (page: Page) => Promise<T>
): Promise<T> {
  let browser: Browser | undefined;
  let context: BrowserContext | undefined;
  try {
    browser = await chromium.launch({ headless: config.headless });
    context = await browser.newContext(
      storageStateExists() ? { storageState: config.storageStatePath } : {}
    );
    const page = await context.newPage();

    await ensureLoggedIn(page);

    const result = await fn(page);

    await context.storageState({ path: config.storageStatePath });
    return result;
  } catch (err) {
    if (context) {
      try {
        fs.mkdirSync(config.debugScreenshotsDir, { recursive: true });
        const screenshotPath = path.join(
          config.debugScreenshotsDir,
          `error-${Date.now()}.png`
        );
        const pages = context.pages();
        if (pages.length > 0) {
          await pages[0].screenshot({ path: screenshotPath, fullPage: true });
          (err as Error & { screenshotPath?: string }).screenshotPath = screenshotPath;
        }
      } catch {
        // Best-effort only — never let screenshot capture mask the real error.
      }
    }
    throw err;
  } finally {
    await browser?.close();
  }
}
