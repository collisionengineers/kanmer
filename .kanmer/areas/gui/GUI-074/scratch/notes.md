## Execute — 2026-08-16

All checklist items complete. Rail: `npm test` (383 tests, all pass, including
manual.test.ts now at 7 tests with `deep-link targets` removed),
`npm run typecheck` (clean across all workspaces), `npm run check:manual`
("manual: up to date (12 chapters)" — confirms FRD-024 is not one of the
curated FROM_FRD sources, so amending it needed no regeneration of
chapters.generated.ts).

Diff is exactly the planned scope: Settings.tsx (button/comment/map/prop, -25
lines), App.tsx (caller prop, -4 lines), styles.css (.help-link rule, -4
lines), manual.test.ts (deep-link targets describe block, -10 lines),
FRD-024 R4 (amended, net +1/-1 line — states the Settings `?` was removed and
references GUI-081 for the unimplemented gate-block clause). No dangling
references to onOpenManual/SETTINGS_HELP/help-link anywhere in apps/gui/src
(grep confirms clean).
