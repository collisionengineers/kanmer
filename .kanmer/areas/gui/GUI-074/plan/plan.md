# Plan — GUI-074: Remove the "?" manual link from the Settings nav

Written FROM `scratch/research.md` and the scheduler's settled answers in
`scratch/scheduling.md`. Chore profile: no separate `research`/`files` doc is
owed — findings live in scratch, treated as binding per the task brief.

## Approach

Delete the Settings-tab `?` deep-link affordance end-to-end (button, its
`SETTINGS_HELP` map, the `onOpenManual` prop and its one caller, the orphaned
`.help-link` CSS) rather than repurposing it, because the two chapters it most
often lands on (`stages`, `profiles`) are stub content pending DOC-007, and
because F1 / Help → Manual already provide entry to the manual without a
per-tab deep link. The test block that appeared to guard this feature
(`manual.test.ts:66-74`) is deleted alongside it — research confirmed it
checked a hardcoded id list that only overlapped `SETTINGS_HELP`'s real
targets on 2 of 5 ids, so it was never actually guarding this code path, and
once the button is gone there are zero deep-link callers left anywhere in the
app for it to guard.

## Governing docs

`refs`: `docs/functional/frd/FRD-024-in-app-manual.md`.

- **Modifies** (explicit user authorization given in the task brief) — R4
  currently reads: *"Contextual entry points: a '?' affordance on Settings
  tabs and on gate-block messages deep-links to the relevant chapter."* This
  plan removes the Settings-tabs half of that sentence, since the affordance
  it describes is being deleted by this ticket. The gate-block-message half of
  R4, and AC3 (*"A gate-block message's '?' opens 'Tickets, profiles &
  gates'"*), describe an affordance that research confirmed was **never
  implemented** — out of scope for this ticket per the scheduler's Q2 answer.
  The amendment must not leave R4 half-true: it will state plainly that the
  Settings `?` affordance has been removed, and reference **GUI-081**
  (already filed by the orchestrator, area `gui`, backlog) for the
  unimplemented gate-block clause, rather than silently dropping it or
  pretending it was addressed.
  - R3 (content pipeline) is untouched — DOC-007 owns that amendment.
- **chapters.generated.ts regeneration**: FRD-024 is **not** in
  `scripts/build-manual.mjs`'s `FROM_FRD` curated list (confirmed by reading
  the script — the 9 curated FRDs are FRD-002, 007, 003, 001, 006, 004, 011,
  010, 020; FRD-024 is absent). Editing FRD-024, including its lead prose,
  therefore has no effect on the generated manual. No `npm run build:manual`
  regeneration is needed for this change. `npm run check:manual` is still run
  on the rail as a sanity check, but is expected to pass unmodified.

## Steps

1. `apps/gui/src/renderer/src/components/Settings.tsx`: remove the `?`
   button block and its preceding comment (currently ~201-213), the
   `SETTINGS_HELP` map (currently ~52-58), the `onOpenManual` prop
   declaration (currently ~49) and its destructuring (currently ~74).
2. `apps/gui/src/renderer/src/App.tsx`: remove the `onOpenManual` caller prop
   passed into `<Settings ...>` (currently ~1653-1656) — its only remaining
   reference in the repo.
3. `apps/gui/src/renderer/src/styles.css`: remove the orphaned `.help-link`
   rule (currently ~1881-1884).
4. `apps/gui/src/renderer/src/manual/manual.test.ts`: delete the
   `describe("deep-link targets")` block (currently ~66-74).
5. `docs/functional/frd/FRD-024-in-app-manual.md`: amend R4 to remove the
   Settings-tab `?` clause, state it was removed, and reference GUI-081 for
   the gate-block clause that was never implemented. Leave R3 and AC3 text
   alone except as strictly needed so R4/AC3 don't misrepresent shipped
   behaviour (AC3 still describes the gate-block affordance GUI-081 owns —
   leave it referencing that ticket's scope, not this ticket's).
6. Run the verification rail (step below) and fix any typecheck/test fallout
   from the removals (e.g. now-unused imports).

## Verification

- `npm test` — the `manual.test.ts` suite (and full suite) must pass with the
  `deep-link targets` block gone and no other regressions.
- `npm run typecheck` — confirms no dangling references to `onOpenManual`,
  `SETTINGS_HELP`, or unused imports left behind.
- `npm run check:manual` — confirms `chapters.generated.ts` is still up to
  date (expected: unaffected, since FRD-024 isn't a curated source FRD).
- Manual sanity check (not re-verifying from scratch, per the task brief):
  confirm `App.tsx:916-920` (F1) and `apps/gui/src/main/index.ts:316-325` →
  `App.tsx:558-562` (Help → Manual) are untouched by the diff.
- Settings nav visually reduces to `SETTINGS_TABS.map(...)` only (5 named
  tabs, no trailing bare `?`).

## Risks / open questions

None open — the task brief states the scheduler has already settled the
three questions research raised (delete the test block; keep the gate-block
clause out of scope and reference GUI-081; sequence GUI-074 before DOC-007).
`get_doc_gates` confirms `questions-resolved: true`. No new operator-only
question has arisen during planning.

Residual risk: DOC-007 also touches `FRD-024-in-app-manual.md` (R3) and
`manual.test.ts`. Per the scheduler's Q3 answer this is mitigated by
sequencing — GUI-074 lands first, DOC-007 rebases onto the settled FRD-024
and test file. No action needed here beyond landing promptly.
