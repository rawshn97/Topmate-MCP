# topmate-mcp — Tools & Features

An MCP server (`topmate-mcp`, v0.1.0) that lets an MCP client (e.g. Claude Desktop) manage a [Topmate.io](https://topmate.io) creator profile: listing, creating, updating, and deleting services, and editing their descriptions and intake questions.

Entry point: `src/index.ts`, registered with `@modelcontextprotocol/sdk`'s `McpServer` over stdio (`StdioServerTransport`).

## How reads vs. writes work

- **Read tools** (`get_profile`, `list_services`, `get_service`) call `GET api.galactus.run/fetchByUsername/?username=<TOPMATE_USERNAME>` directly (`src/topmate/apiClient.ts`) — no login required, no browser.
- **Write tools** (`create_service`, `update_service`, `delete_service`, `update_questions`) drive a real, logged-in Playwright browser session (`src/topmate/browser.ts`, `src/topmate/actions.ts`, `src/topmate/selectors.ts`) through the actual Topmate dashboard UI.
- Session cookies persist in `storage-state.json` after the first interactive login (OTP via email — no password auth exists on Topmate).

## Tools exposed

| Tool | Type | Parameters | Description |
|---|---|---|---|
| `get_profile` | Read (API) | none | Fetches name, title, bio, and full service list. Meant to be called first, as style/context reference before drafting anything new. |
| `list_services` | Read (API) | none | Lists all current services with IDs, titles, descriptions, pricing, and intake questions. |
| `get_service` | Read (API) | `serviceId: string` | Fetches one service's full detail by ID. |
| `create_service` | Write (browser) | `title: string`, `description: string`, `price?: number`, `currency?: string`, `durationMinutes?: number`, `questions?: string[]` | Creates a new service. Expects final, polished content — not rough notes. |
| `update_service` | Write (browser) | `serviceId: string`, `title?`, `description?`, `price?`, `durationMinutes?`, `questions?: string[]` | Edits an existing service; only supplied fields change. Providing `questions` replaces the full set. |
| `update_questions` | Write (browser) | `serviceId: string`, `questions: string[]` | Replaces a service's intake questions wholesale. |
| `delete_service` | Write (browser) | `serviceId: string`, `confirm: boolean` | Destructive/irreversible. Calling with `confirm` omitted/false returns what *would* be deleted (title + id) without doing anything — a built-in confirmation gate; only `confirm: true` actually deletes. |
| `update_profile` | Write (browser) | `title?: string`, `description?: string` | Edits the profile tagline/bio. **Not working yet** — see Known limitations below. |

## Project layout

- `src/index.ts` — server bootstrap, registers all 8 tools.
- `src/config.ts` — env/config loading (`TOPMATE_EMAIL`, `TOPMATE_USERNAME`, `HEADLESS`, etc. via `.env`/`dotenv`).
- `src/types.ts` — shared TypeScript types.
- `src/tools/*.ts` — one file per MCP tool; each wraps a Zod input schema around a call into `topmate/actions.ts` or `topmate/apiClient.ts`.
- `src/topmate/apiClient.ts` — unauthenticated read path (`fetchByUsername` API).
- `src/topmate/browser.ts` — Playwright browser/session lifecycle, `storage-state.json` persistence, OTP login flow.
- `src/topmate/actions.ts` — write-path business logic (create/update/delete service, update questions/profile), driving the dashboard UI.
- `src/topmate/selectors.ts` — every CSS/text selector the browser automation depends on, with comments on what each is for and its verification status against a live account. This is the file to fix when Topmate changes their UI and a write tool starts failing.

## Debugging tools/features

- Failed write-tool calls save a screenshot to `debug-screenshots/error-<timestamp>.png` at the moment of failure.
- `npx playwright codegen https://topmate.io/dashboard/services` opens a real browser + recorder to capture correct selectors after clicking through a flow manually — used to repair `selectors.ts`.

## Known limitations

- `update_profile` doesn't work yet. `/dashboard/profile` is a drag-and-drop page builder: the bio/tagline renders inside an embedded iframe of the live public profile, editable only via direct clicks on rendered text or unlabeled toolbar icons. Needs a `HEADLESS=false` human-observed run to identify the right clicks before `selectors.ts`'s `profileForm` section can be filled in.
- Not implemented: availability/pricing-tier management (Topmate may expose these as separate settings from services).
- Topmate has no official public API and no password login (email OTP only) — this project is unsanctioned browser automation, so it's exposed to rate-limiting, anti-automation flags, or breakage whenever Topmate's UI changes.
