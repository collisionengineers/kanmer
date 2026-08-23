# Checklist — CORE-084

## Preparation

- [x] Read CORE-080/CORE-043 packets, review scratch, group context, and governing docs.
- [x] Confirm the implementation base is CORE-080 head `0e1be5f32efad1da57ee27bd2a2fe80033976bd1`.

## Implementation

- [x] Add the production `syncProject` manual Retry mismatch regression.
- [x] Assert no `syncBoard` call and no ref mutation.
- [x] Preserve exact-destination and genuine-error assertions from CORE-080; the inherited 26-test suite remains intact.
- [x] Update cumulative packet/review dispositions with the remediation head and evidence.

## Verification and handoff

- [x] Run focused GUI, typecheck, script, and diff checks with exit codes.
- [x] Write the post-implementation report and update the checklist.
- [x] Open a PR targeting `core-043-protection-retarget`; stop at Review.
- [x] Post-merge proof on merged main. — reconciled against merged-main proof; inherited external limits remain recorded.

## Progress notes

- 2026-08-22: Created `.worktrees/core-084` on `core-084-retry-caller-regression` at CORE-080 head `0e1be5f32efad1da57ee27bd2a2fe80033976bd1`; no board-worktree edits.
- 2026-08-22: Added the production-caller regression in `index.sync.test.ts`. It invokes the exported internal test seam for the real `syncProject` function with a real Git repository whose live branch is mismatched; the test asserts paused mismatch, zero `syncBoard` calls, unchanged refs/worktrees, and unchanged fixture content. Existing CORE-080 helper assertions remain unchanged.
- 2026-08-22: `npm run test -w @kanmer/gui -- src/main/kanmerGit.test.ts src/main/index.sync.test.ts --reporter=dot` exited 0: 2 files, 27/27 tests.
- 2026-08-22: `npm run typecheck -w @kanmer/gui` exited 0.
- 2026-08-22: First `npm run test:scripts` exited 1 because this fresh worktree had no `packages/core/dist/index.js`; 87/89 passed and the two failures were `auto-run-state.test.mjs` and release-notes. Failure preserved. After `npm run build:core` exited 0, the rerun `npm run test:scripts` exited 0: 89/89.
- 2026-08-22: `git diff --check` exited 0. Prior CORE-080 full-GUI/provider baseline failures remain recorded in the parent packet; this bounded remediation does not alter those suites.
- 2026-08-22: PR #203 opened against `core-043-protection-retarget` from commit `7cca4bf9e799aa161b6e5da879e6ad942b13154c`; independent review/merge is required. External hosted protection/Actions-variable mutation remains INCONCLUSIVE and out of scope.


## 2026-08-23 Done reconciliation

All previously unticked items were reconciled against the ticket's merged-main proof, review/closeout records, or an explicit INCONCLUSIVE disposition already preserved there. No external or hosted limitation was upgraded to PASS by this edit.
