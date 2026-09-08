---
name: Bug report
about: A tool failed, or produced the wrong result
title: ""
labels: bug
assignees: ""
---

**Which tool, and what did you call it with?**
e.g. `update_service({ serviceId: "123", price: 500 })`

**What happened?**
Paste the error message / returned JSON.

**What did you expect?**

**Screenshot, if the error included one**
Write tools save a screenshot to `debug-screenshots/error-<timestamp>.png` on failure — attach it if you have it (please redact anything personal, like pricing you don't want public, first).

**Does it reproduce consistently, or only sometimes?**
Topmate's dashboard UI can change without notice, so a selector that worked before can legitimately start failing — consistent failures are usually a broken selector (see `src/topmate/selectors.ts`); intermittent ones are more likely timing/network related.

**Environment**
- OS:
- Node version (`node -v`):
- `HEADLESS` setting:
