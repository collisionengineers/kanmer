# Post-implementation report — CORE-084

## Summary

CORE-084 closes the CORE-080 review gap by exercising the production `syncProject` manual Retry caller. A real Git fixture is observed on `main` while the cached board status expects `kanmer-board`; the regression proves the caller returns the paused mismatch before `syncBoard`, performs no branch/ref/worktree mutation, and leaves the fixture content unchanged.

## Changes

| File | Change | Why |
|---|---|---|
| `apps/gui/src/main/index.ts` | Exported a narrowly scoped `__kanmerTest` seam containing the existing `contexts` map and `syncProject` function; production behavior and renderer IPC contract are unchanged. | Lets a focused test invoke the exact production caller with a controlled open-project context instead of testing only the preflight helper. |
| `apps/gui/src/main/index.sync.test.ts` | Added a real-Git regression with Electron/updater test doubles. It invokes `syncProject(projectId)` in manual mode, asserts mismatch/paused state, asserts `syncBoard` is not called, and compares refs/worktrees/content before and after. | Directly satisfies CORE-080's missing production-caller acceptance check without weakening inherited helper assertions. |

No CORE-080 implementation files, governing docs, MCP transport, board files, GitHub protection, Actions variables, or unrelated GUI behavior were changed.

## Governing docs and linked packet

- FRD-020 R3/R5 and ADR-0016 remain satisfied by the inherited CORE-080 implementation: live branch observation precedes sync, mismatch remains fail-closed, and retained-ref handoff stays an explicit operator boundary.
- CORE-080's helper-level exact-destination and genuine-error assertions remain intact; this ticket only adds the missing production-caller regression.
- HZN-007 and EPIC-009 require independent review/merge, adjacent stage transitions, exact commit traceability, and no fabricated hosted proof; those boundaries are preserved.

## Verification evidence

- `npm run test -w @kanmer/gui -- src/main/kanmerGit.test.ts src/main/index.sync.test.ts --reporter=dot`: exit 0, 2 files / 27 tests passed.
- `npm run typecheck -w @kanmer/gui`: exit 0.
- First `npm run test:scripts`: exit 1 because the fresh worktree lacked `packages/core/dist/index.js`; 87/89 passed and the two exact failures were `scripts/auto-run-state.test.mjs` and `scripts/release-notes.test.mjs`. This first failure is preserved, not erased.
- `npm run build:core`: exit 0.
- Rerun `npm run test:scripts`: exit 0, 89/89.
- `git diff --check`: exit 0.

The inherited CORE-080 report records the earlier full GUI/provider and GUI typecheck failures on its cumulative base. This remediation's focused GUI typecheck is green; no full-suite result is reclassified or fabricated here. No hosted checks are configured for the stacked non-main PR target, so hosted protection and Actions-variable mutation remain INCONCLUSIVE.

## Review and verification hand-off

Review the exact remediation head against CORE-080's `0e1be5f32efad1da57ee27bd2a2fe80033976bd1`. Confirm the production-caller test remains wired to `syncProject`, all inherited helper assertions remain present, and the PR targets `core-043-protection-retarget`. After independent merge, run the focused GUI Git tests, GUI typecheck, scripts rail, and merged-main checks; write proof only on merged main.
