import { withPage } from "./topmate/browser.js";
import { config } from "./config.js";

async function runLogin() {
  console.log(`Starting Topmate authentication for ${config.email()} (@${config.username()})...`);
  console.log("A browser window will open if sign-in is required. Enter the 6-digit OTP code received in your email.");

  await withPage(async (page) => {
    console.log("Authentication successful! Current page:", page.url());
  });

  console.log("Session saved to storage-state.json. Future calls can run in headless mode.");
}

runLogin().catch((err) => {
  console.error("Login encountered an error:", err.message);
  process.exit(1);
});
