# Open questions — GUI-131

- [x] **Was `out/main/index.js` absent from the v0.3.4 packaged app?** No. The hosted log reports it built twice, and direct inspection of a clean package at `102ba3b120cc3065943089d122a6172de8934ece` confirms it is in `app.asar`.
- [x] **Can this ticket repair the actual hosted failure without expanding scope?** No. The observed failure is missing `GH_TOKEN` during implicit tag-based publishing; changing that would alter release workflow/semantics, which GUI-131 expressly excludes.

## Parked (explicitly deferred)

- [ ] Should the tag verification job supply a publishing credential or prevent implicit publishing? Deferred to a separately authorized release-scope decision; reopening requires an owner to choose the intended tag-workflow publication policy.
