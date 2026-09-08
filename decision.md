# Decision Log

Major architectural/product decisions and any changes to services (tools) exposed by this MCP server. Newest entries at the top. When adding an entry: date, what changed, why, and the tradeoff/impact if relevant.

---

## 2026-09-07 — Initial architecture: split reads (public API) from writes (browser automation)

**Decision:** Read operations (`get_profile`, `list_services`, `get_service`) go through Topmate's undocumented public `fetchByUsername` API directly. Write operations (`create_service`, `update_service`, `delete_service`, `update_questions`, `update_profile`) drive a real logged-in Playwright browser session through the dashboard UI instead.

**Why:** Topmate publishes no official API, has no password login (email OTP only), and no scriptable way to write data server-side. The public profile-render endpoint (`api.galactus.run/fetchByUsername`) is safe and stable enough for reads since it's the same data Topmate serves to anyone viewing a public profile. Writes have no such endpoint, so browser automation of the actual dashboard is the only viable path.

**Impact:** Write tools are inherently fragile — any Topmate UI/selector change can break them (mitigated by centralizing all selectors in `src/topmate/selectors.ts` with verification comments, plus failure screenshots to `debug-screenshots/`). There's also a standing risk Topmate rate-limits, flags, or blocks this kind of automated access since it isn't sanctioned.

## 2026-09-07 — Session persistence via storage-state.json, first-run requires human OTP entry

**Decision:** Playwright's authenticated session is persisted to `storage-state.json` and reused across runs. The very first write (or whenever the session expires) requires running with `HEADLESS=false` so a human can manually enter the emailed one-time code.

**Why:** Topmate's only login mechanism is an emailed OTP; there is no way to script reading that email, so full unattended automation of login isn't possible.

**Impact:** `storage-state.json` holds live session cookies — treated as sensitive as a password, git-ignored. Deployments/automation that can't tolerate an occasional human-in-the-loop OTP step will periodically need manual re-auth when the session expires.

## 2026-09-07 — delete_service requires explicit confirm=true

**Decision:** `delete_service` is a two-step tool: calling it without `confirm: true` performs no deletion and instead returns which service (by title/id) *would* be deleted. Only an explicit `confirm: true` on a second call actually deletes.

**Why:** Deletion is destructive and irreversible with no undo path on Topmate; the tool description explicitly requires the calling agent to confirm the target with the user before setting `confirm: true`.

**Impact:** Any client (human or agent) integrating this tool must handle the two-call confirmation flow rather than expecting a single-call delete.

## 2026-09-07 — update_profile shipped but non-functional; deferred

**Decision:** `update_profile` (profile title/bio edit) is registered as a tool but does not work yet — left in as a known limitation rather than removed or blocked from registration.

**Why:** `/dashboard/profile` turned out to be a drag-and-drop page builder rendering the bio/tagline inside an embedded iframe of the live public profile page, edited via direct clicks on rendered text or unlabeled toolbar icons — not reverse-engineerable via `playwright codegen` or headless probing. Fixing it requires a `HEADLESS=false` session with a human identifying the correct interactions.

**Impact:** Callers should expect `update_profile` to fail/no-op until `selectors.ts`'s `profileForm` section is filled in from a real observed session.

## 2026-09-07 — Availability/pricing-tier management out of scope for now

**Decision:** Managing availability or pricing tiers (if Topmate exposes them as settings separate from services) is not implemented.

**Why:** Not needed for the initial tool set (service CRUD + questions + profile text); noted as straightforward to add later the same way (browser automation) if needed.

**Impact:** None currently — documented as a deliberate scope boundary, not an oversight, so it isn't mistaken for a bug later.
