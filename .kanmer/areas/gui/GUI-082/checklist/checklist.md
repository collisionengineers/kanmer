# GUI-082 checklist — stylesheet selector audit

- [x] Re-run selector inventory and confirm live dynamic selector producers; generated selectors are documented in the report.
- [x] Confirm FRD-019 and GUI-072 constraints before editing.
- [x] Remove dead priority badge selectors.
- [x] Remove dead list/chip selectors.
- [x] Remove retired editor/settings selector blocks.
- [x] Remove retired document/profile editor selector blocks.
- [x] Consolidate TicketCreate .check-row into .check while preserving spacing/type.
- [x] Preserve drag/drop, dispatch-state, and generic checkbox rules.
- [x] Add focused stylesheet audit regression coverage.
- [x] Run focused stylesheet test: 5/5.
- [x] Run all GUI Vitest tests: 319/319.
- [x] Run GUI typecheck.
- [x] Run GUI build.
- [x] Re-run source audit and inspect scoped diff; removed-selector scan is clean.
- [x] Write post-implementation report with commands and results.
- [x] Commit implementation and tests at 74f35c1a0af0a9d197a8a4aa0f6d5bd3a279aea8.
- [x] Branch is pushed and ready for a ticket-linked PR.
- [x] Independent review PASS recorded in scratch/review.md; no findings required remediation.
- [x] PR #125 merged at 802758af0d188597a4ab2783ecf9b70c0bf58631.
- [x] Merged-main proof written; GUI 338/338 passed and gates pass.
- [x] Closeout completed: exact .worktrees/gui-082 removed, local/remote GUI-082-stylesheet-selector-audit branches deleted, ticket released.

## Progress notes

Author-lane evidence is complete; the final five boxes are independent review, merge, merged-main proof, and closeout gates.
