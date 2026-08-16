## Review — 2026-08-16

**I am both author and reviewer of this PR.** Not an independent review.

### Changes (from `gh pr diff`, own words)

1. `apps/gui/src/renderer/src/components/Settings.tsx` (-25/+0 net across
   three hunks) — removes the `onOpenManual` prop declaration and its
   destructure, the `SETTINGS_HELP` map, and the `?` button block (with its
   preceding comment) that rendered after `SETTINGS_TABS.map(...)` inside
   `<nav className="settings-rail">`.
2. `apps/gui/src/renderer/src/App.tsx` (-4/+0) — removes the `onOpenManual`
   callback passed into `<Settings ...>`, the only caller of that prop
   anywhere in the repo.
3. `apps/gui/src/renderer/src/styles.css` (-4/+0) — removes the `.help-link`
   rule, used only by the deleted button.
4. `apps/gui/src/renderer/src/manual/manual.test.ts` (-10/+0) — removes the
   `describe("deep-link targets")` block. `byId` (used elsewhere in the file
   by the shortcuts-chapter tests) is untouched and still used, so no new
   dead code there.
5. `docs/functional/frd/FRD-024-in-app-manual.md` (net 1 line changed) —
   R4 rewritten: drops the Settings-tabs clause, states it was removed by
   GUI-074, and references GUI-081 for the gate-block clause (confirmed
   never implemented). R3 and AC3 untouched, as scoped.

Diff is exactly the ticket's listed scope plus the two items the ticket
explicitly called "the same change, not an unplanned extra": the
`.help-link` CSS and the `manual.test.ts` deep-link-targets block. No
unplanned extras present.

### Comments

- None blocking. The diff is a clean subtraction matching plan.md step for
  step; grep during execute confirmed zero remaining references to
  `onOpenManual`, `SETTINGS_HELP`, or `.help-link` anywhere in
  `apps/gui/src`.
- Non-blocking observation for the record: the `manual.test.ts` deletion
  removes a test that, per research, was checking the *wrong* id list (only
  2 of its 6 checked ids overlapped `SETTINGS_HELP`'s 5 real targets —
  `profiles` and `stages`). It was never a real guard against a dead deep
  link in this code path. Recording this here per the scheduler's Q1
  instruction, so the reasoning is visible in the ticket's history and not
  only in scratch/scheduling.md.

### Disposition

All points: no fix needed, diff already matches plan and scope.

### Verdict: **PASS**

Checked:
- Report against diff: no `post-implementation-report.md` exists or is
  owed — `get_doc_gates GUI-074` shows the `chore` profile has no
  Implementing→Review document boundary at all (`reachable` already
  included `review` once `plan` existed). Diff was checked directly
  against `plan.md` instead, and matches it exactly.
- Governing docs: plan's Governing docs section said FRD-024 R4 would be
  modified (explicit user authorization, per the task brief) to drop the
  Settings-tabs clause and reference GUI-081 for the untouched gate-block
  clause; the shipped diff does exactly that, and leaves R3/AC3 alone as
  scoped to DOC-007.
- Code: correctness confirmed by the rail run during execute (`npm test` —
  383 tests pass; `npm run typecheck` — clean; `npm run check:manual` —
  "up to date (12 chapters)", confirming FRD-024 is not one of the curated
  `FROM_FRD` sources so no chapters.generated.ts regeneration was needed).
  Ripple effects (App.tsx caller, styles.css, manual.test.ts) all followed
  up in this same diff, matching the ticket's own instruction that these
  are the same change.

Proceeding to merge and move to Verifying.
