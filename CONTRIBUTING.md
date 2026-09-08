# Contributing to topmate-mcp

Thanks for considering a contribution. This project is unofficial browser automation against a real product with no public write API, so a few things here work a little differently than a typical TypeScript repo — please read the "Testing" section before opening a PR that touches `src/topmate/`.

## Getting set up

```bash
git clone https://github.com/priyanshu-arya/Topmate-MCP.git
cd Topmate-MCP
npm install
npx playwright install chromium
cp .env.example .env   # fill in your own Topmate account for testing
npm run dev             # tsc --watch
```

## Project layout

- `src/tools/*.ts` — one file per MCP tool, each just a Zod schema wrapper around `topmate/actions.ts` or `topmate/apiClient.ts`. Keep these thin.
- `src/topmate/apiClient.ts` — the unauthenticated read path (`fetchByUsername`). No browser involved.
- `src/topmate/browser.ts` — Playwright session lifecycle (login, `storage-state.json`, error screenshots). Rarely needs changes.
- `src/topmate/actions.ts` — the actual browser-automation logic for every write tool.
- `src/topmate/selectors.ts` — every CSS/text selector the automation depends on, each with a comment on what it's for and whether it's been verified against a live account. This is almost always the file you'll touch when Topmate changes their UI.

## Code style

- TypeScript, strict mode, no `any` beyond what's already there.
- No comments explaining *what* code does — name things clearly instead. A comment is only worth adding when it explains a non-obvious *why* (a workaround, an assumption baked into a selector, a constraint from Topmate's UI).
- Don't add abstractions, config flags, or error handling for cases that can't happen. Match the existing minimal style in `actions.ts`.
- Run `npx tsc --noEmit` before opening a PR — there's no separate lint step yet.

## Testing a change

There's no mocked test suite — this project drives a real logged-in browser against Topmate's real dashboard, so "testing" means running it against a real (ideally throwaway) account:

1. Build: `npm run build`.
2. Set `HEADLESS=false` in `.env` for your first run so you can complete the email-OTP login by hand; after that `storage-state.json` is reused.
3. For anything touching `create_service`/`update_service`/`delete_service`/`update_questions`, create a clearly-named throwaway service (e.g. `"TEST - DELETE ME"`) and exercise your change against *that*, not a real offering. Delete it when you're done.
4. If a selector is wrong, `npx playwright codegen https://topmate.io/dashboard/services` is the fastest way to find the right one — see the README's "Selector Debugging & Self-Healing" section.
5. When you fix or add a selector, update the comment above it in `selectors.ts` to say what's now verified and how (which is exactly what makes the next person's fix faster).

## Opening a PR

- Keep PRs focused — a selector fix and a new tool should be separate PRs.
- Describe what you tested it against (e.g. "ran `update_service` against a throwaway service, confirmed via `get_service`") since there's no CI that can verify live-dashboard behavior for you.
- If your change affects `update_profile` (currently non-functional — see README's Known Limitations), please share what you learned about the profile editor's real DOM/interactions even if your PR doesn't fully fix it; that's the main blocker right now.

## Reporting bugs

Open a GitHub issue with:
- Which tool failed and the error message returned.
- The screenshot path from `debug-screenshots/error-<timestamp>.png`, if one was produced (please redact anything personal before attaching it).
- Whether it reproduces consistently or intermittently — Topmate's UI can change without notice, so a selector that worked yesterday can legitimately break today.
