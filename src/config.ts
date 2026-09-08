import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Project root (one level up from src/, and dist/ mirrors the same layout
// once compiled, so this resolves correctly whether running from src or dist).
const PROJECT_ROOT = path.resolve(__dirname, "..");

// Load .env from the project root explicitly — dotenv/config's default
// resolves relative to process.cwd(), which isn't this directory when the
// server is launched by Claude Desktop (or any other host with its own cwd).
dotenv.config({ path: path.join(PROJECT_ROOT, ".env") });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable "${name}". Copy .env.example to .env and fill it in.`
    );
  }
  return value;
}

export const config = {
  email: () => requireEnv("TOPMATE_EMAIL"),
  username: () => requireEnv("TOPMATE_USERNAME"),
  baseUrl: process.env.TOPMATE_BASE_URL ?? "https://topmate.io",
  // Topmate's internal backend lives on the "api." subdomain of galactus.run,
  // not the bare domain — confirmed by capturing the dashboard's own network
  // traffic (the bare domain resolves to an unrelated third-party service).
  apiBaseUrl: process.env.TOPMATE_API_BASE_URL ?? "https://api.galactus.run",
  headless: (process.env.HEADLESS ?? "true").toLowerCase() !== "false",
  storageStatePath: path.join(PROJECT_ROOT, "storage-state.json"),
  debugScreenshotsDir: path.join(PROJECT_ROOT, "debug-screenshots"),
};
