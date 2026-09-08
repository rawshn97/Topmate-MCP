/**
 * Every selector in this file targets Topmate's real, logged-in dashboard
 * DOM. `login`, `servicesList`, `createForm`, `editForm`, `questions`, and
 * `serviceActions` are all verified against a live account (see the
 * per-section notes below for exactly what was exercised).
 *
 * `profileForm` is still a guess — the profile editor turned out to be a
 * visual drag-and-drop page builder (the bio/tagline render inside an
 * embedded iframe of the live public profile), not a plain form, so it needs
 * a `HEADLESS=false` walkthrough to nail down rather than blind codegen. See
 * README's "Fixing broken selectors".
 *
 * How to re-verify or fix a selector if Topmate changes their UI:
 *   1. Log into Topmate normally in a real browser.
 *   2. Run: npx playwright codegen https://topmate.io/dashboard/services
 *      This opens a recorder browser + a script window. Click through the
 *      real flow (add a service, edit one) and it prints the actual
 *      selectors Playwright would use.
 *   3. Copy the relevant selector(s) into this file.
 */
export const selectors = {
  login: {
    // Topmate's real sign-in page is /sign-in, not /login — /login is
    // actually a public creator profile for a user named "login". Confirmed
    // by capturing the live sign-in flow's own network traffic.
    signInUrl: "/sign-in",
    emailInput: 'input[type="email"], input[name="email"], input[placeholder*="email" i]',
    // Topmate uses email-OTP login, not a password — there is no password
    // field on the real form. This button triggers the OTP email.
    submitButton: 'button:has-text("Continue"), button:has-text("Log in"), button:has-text("Sign in"), button[type="submit"]',
  },

  servicesList: {
    dashboardUrl: "/dashboard/services",
    // Verified live: the real button reads "+ Add New" (opens a service-type
    // picker), not "Add service"/"New service". The page renders a second,
    // hidden copy of this button (likely a responsive/mobile variant) earlier
    // in the DOM, so :visible is required — otherwise .first() grabs the
    // hidden one and the click silently times out.
    addServiceButton: 'button:has-text("Add New"):visible',
  },

  /**
   * Step 1 of creating a service. Verified live: clicking "+ Add New" goes
   * straight to /dashboard/services/add?currentTab=video with this form —
   * no intermediate service-type picker. Clicking `nextButton` immediately
   * creates the service (toast: "Service created successfully") and lands
   * on the same edit screen described by `editForm` below, for step 2.
   */
  createForm: {
    titleInput: "#ServiceForm_title",
    durationInput: "#ServiceForm_duration",
    chargeInput: "#ServiceForm_charge",
    nextButton: 'button:has-text("Next: Customize")',
  },

  /**
   * The service edit screen (also step 2 of creation). Verified live against
   * a real service (id 2287335, "TEST SERVICE - DELETE ME").
   *
   * The form is split into independent sections (Title/Short
   * Description/Price, Duration, Service Description) that each render
   * their own "Save" button only once a field in that section is dirtied,
   * and each PATCHes api.galactus.run/service/<id> independently. Rather
   * than track which section owns which button, `actions.ts` just clicks
   * every visible Save button in a loop until none remain — harmless to
   * click one that isn't there, and robust to Topmate regrouping fields.
   */
  editForm: {
    editUrl: (id: string, type: number | string) =>
      `/dashboard/services/edit/basic-details?id=${id}&type=${type}`,
    titleInput: "#title",
    // Topmate has two separate description fields: this short one (shown
    // under the service title) and the rich-text one below. ServiceInput
    // only models one `description`, which this codebase maps to the
    // rich-text `descriptionEditor` — the fuller, primary content — leaving
    // this short field untouched. See fillEditForm in actions.ts.
    shortDescriptionInput: "#short_custom_description",
    priceInput: "#charge",
    durationInput: "#duration",
    // A Quill rich-text editor, not a plain textarea — filled by clicking
    // in, selecting all, and typing, not `.fill()`. See actions.ts.
    descriptionEditor: ".ql-editor",
    saveButton: 'button:has-text("Save")',
    // Every observed success toast on this page contains "successfully"
    // ("Service created successfully", "Title, description and price
    // updated successfully!", "Schedule updated successfully!", "Service
    // description updated successfully!") — this one regex covers all of
    // them instead of enumerating each section's exact wording.
    successToast: "text=/successfully/i",
  },

  /**
   * Invitee questions live under a shared modal, verified live: the pencil
   * icon on an existing question opens "Edit Question" (submit button reads
   * "Edit Question", plus a "Delete" button); "+ Add Question" opens the
   * identically-shaped "New Question" modal (submit button reads
   * "Add Question"). Adding one POSTs api.galactus.run/service-questions/
   * (201) — confirmed live. Deleting one was not clicked through live (to
   * avoid mutating the test service's questions unnecessarily); the modal's
   * "Delete" button is used on a best-effort basis — see replaceQuestions in
   * actions.ts.
   */
  questions: {
    addQuestionButton: 'button:has-text("+ Add Question")',
    editQuestionButton: 'button[class*="QuestionsSection_editButton"]',
    modal: ".ant-modal-content",
    modalQuestionInput: "input",
    addSubmitButton: 'button:has-text("Add Question")',
    editSubmitButton: 'button:has-text("Edit Question")',
    deleteButton: 'button:has-text("Delete")',
  },

  /**
   * "Delete Service" lives on the edit page itself (see editForm.editUrl),
   * not a hover/kebab menu on the services list. Verified live up to (but
   * not including, to avoid deleting the live test service prematurely) the
   * final confirm click — the confirm dialog's buttons ("Cancel" / "Yes,
   * Delete") were observed opening it.
   */
  serviceActions: {
    deleteServiceButton: 'button:has-text("Delete Service")',
    confirmDeleteButton: 'button:has-text("Yes, Delete")',
  },

  profileForm: {
    // GUESS — unverified. The real editor at /dashboard/profile (reached via
    // sidebar "Edit Public Profile" -> "Customize public profile") turned
    // out to be a visual page builder: the bio/tagline render inside an
    // embedded iframe of the live public profile page itself, edited via a
    // row of unlabeled toolbar icon buttons with no aria-label/title to
    // distinguish them. This needs a HEADLESS=false walkthrough (a human
    // watching and confirming what each icon/click does) rather than blind
    // codegen — see README's "Fixing broken selectors".
    dashboardUrl: "/dashboard/profile",
    titleInput: 'input[name="title"], input[placeholder*="tagline" i], input[placeholder*="title" i]',
    descriptionInput: 'textarea[name="description"], textarea[placeholder*="bio" i], textarea[placeholder*="about" i]',
    saveButton: 'button:has-text("Save"), button:has-text("Update")',
    successToast: "text=/saved|updated/i",
  },
};
