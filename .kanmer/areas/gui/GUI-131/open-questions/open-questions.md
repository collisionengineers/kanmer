# Open questions — GUI-131

- [x] **Was `out/main/index.js` absent from the v0.3.4 packaged app?** No. The hosted log reports it built twice, and direct inspection of a clean package at `102ba3b120cc3065943089d122a6172de8934ece` confirms it is in `app.asar`.
- [x] **Can this ticket repair the actual hosted failure without expanding scope?** No. The observed failure is missing `GH_TOKEN` during implicit tag-based publishing; changing that would alter release workflow/semantics, which GUI-131 expressly excludes.

## 2026-08-24 reopened differential questions

- [x] **Is the missing entry an Electron Builder `files`-rule regression?** No. The same rule and Electron Vite configuration are unchanged across the passing v0.3.4 and failing v0.3.5 targets; the failed artifact has no `out/` payload because no GUI build ran in the publisher path.
- [x] **Does the shared verification rail create the GUI bundle for the publisher?** No. Its root build is core + MCP server only, and the exact clean publisher clone had no `apps/gui/out` directory after verification.
- [ ] **Where in the future `--publish` control flow should the GUI build occur?** It must precede Electron Builder. Planning must decide and test whether it must also precede immutable tag creation so a GUI-build failure cannot strand another tag, while preserving the existing single-package publication contract.

## Parked (explicitly deferred)

- [ ] Should the tag verification job supply a publishing credential or prevent implicit publishing? Deferred to a separately authorized release-scope decision; reopening requires an owner to choose the intended tag-workflow publication policy.
