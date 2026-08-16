## Scheduler decisions — 2026-08-16, HZN-003 auto run

All three open questions raised by research are planner/scheduler-level, not
operator-level. Resolved here so the planner does not re-open them. None of these
needed the operator; do not escalate them.

**Q1 — delete `manual.test.ts:66-74` (`describe("deep-link targets")`), or keep it
as a guard against re-introduction?**
**Delete it.** Research established that the Settings `?` was the only chapter
deep-linker in the app, and that the block's hardcoded id list matched only 2 of
the 5 ids `SETTINGS_HELP` actually used — so it was never guarding what it
appeared to guard. A test that outlives its feature and was already checking the
wrong list is not a safety net; it is a false one. Removing the feature and
leaving the test is how the next reader concludes deep-links still exist. Record
the deletion and the 2-of-5 finding in the post-implementation report so the
reasoning is visible in the diff rather than only here.

**Q2 — should the FRD-024 amendment also cover R4's other clause and AC3 (the
gate-block-message "?" that was never implemented)?**
**No — out of scope, but not dropped.** GUI-074 amends R4 only to remove what it
actually removes: the Settings-tab `?` affordance. The gate-block `?` is a
different defect — a requirement that was never built at all — and folding an
unimplemented-feature finding into a removal ticket hides it. File it as its own
ticket in the `gui` area, OUTSIDE HZN-003, so the 0.3.3 scope stays fixed. The
orchestrator files it; the GUI-074 implementer does not.

Be precise in the amendment: R4 must not be left half-true. State that the
Settings `?` is removed, and reference the new ticket for the clause that was
never implemented.

**Q3 — sequence GUI-074 and DOC-007, or accept parallel work with a manual merge?**
**Sequence them. Same lane, serial, GUI-074 FIRST.**
Both amend `docs/functional/frd/FRD-024-in-app-manual.md` and both may touch
`apps/gui/src/renderer/src/manual.test.ts` — that is a same-file collision on two
files, not a sequencing nicety. GUI-074 is small and subtractive; DOC-007 is a
large content rewrite that also drops `FROM_FRD` from `scripts/build-manual.mjs`
and amends R3. Landing the small subtraction first means DOC-007 rebases onto a
settled FRD-024 rather than merging two concurrent edits to the same requirement
block.

**Lane change: GUI-074 moves from lane C to lane E, ahead of DOC-007.**
Lane E order is therefore: GUI-074 → DOC-007.

**Confirmed and not at risk:** the manual stays reachable after this change via F1
(`App.tsx:916-920`) and Help → Manual (`apps/gui/src/main/index.ts:316-325`).
Neither path touches `Settings.tsx` or `onOpenManual`. The conflict the
orchestrator was watching for — GUI-074 making the manual unreachable and
stranding DOC-007 — does not exist. That was checked, not assumed.

**Also in scope, found by research and not in the ticket text:** the `.help-link`
CSS rule at `apps/gui/src/renderer/src/styles.css:1881-1884` is used only by this
button and is orphaned once it goes. Remove it in the same PR — it is the same
change, not an unplanned extra.
