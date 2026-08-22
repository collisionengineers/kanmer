# CORE-048 post-implementation report

## Result

CORE-048 remediates the three independent CORE-043 review blockers without changing ADR-0016's conservative protection inference. Open GUI projects now refresh the actual worktree branch before protected-transition decisions, a requested move away from the protected default is retained/invalidate while no Git board is open, and the hosted kanmer-gate fetches a configured repository-variable branch with the existing default during migration.

## Scope and files

- `apps/gui/src/main/kanmerGit.ts`: added the production branch refresh and guarded preference helper.
- `apps/gui/src/main/index.ts`: refreshes all open contexts before deciding protected refusal and applies the no-open-board guard.
- `apps/gui/src/main/kanmerGit.test.ts`: deterministic administrator-handoff refresh and no-board preference regressions; all inherited CORE-043 Git assertions remain present.
- `.github/workflows/pr.yml`: `KANMER_BOARD_BRANCH` repository variable (fallback `kanmer-board`) drives the hosted board fetch/worktree.
- `scripts/pr-workflow.test.mjs`: dependency-free static regression for the configured workflow branch contract.

No GitHub protection API, provider dispatch, MCP, skills-lock, or unrelated GUI behavior was changed. The explicit ADR-0016 accepted risk remains: literal/default protection inference is conservative and live protection retargeting is not claimed.

## Verification

| Command | Exit | Result |
| --- | ---: | --- |
| `npm run test -w @kanmer/gui -- --run src/main/kanmerGit.test.ts` | 0 | 16/16 focused GUI Git tests pass. |
| `node --test scripts/pr-workflow.test.mjs` | 0 | 1/1 configured-branch workflow assertions pass. |
| `npm run build:core` | 0 | Core artifact rebuilt for script rails. |
| `npm run test:scripts` after core build | 0 | 89/89, including the new workflow test. |
| `npm run verify:docs` | 0 | Documentation/link/provider checks pass. |
| `npm run check:manual` | 0 | Manual current, 22 chapters. |
| `git diff --check` | 0 | Clean. |

## Preserved first failures and boundaries

- First `npm run test:scripts` attempt exited 1 with two missing `packages/core/dist/index.js` module errors in `auto-run-state.test.mjs` and `release-notes.test.mjs`. The required `npm run build:core` then exited 0 and the rerun is 89/89; the first failure remains recorded here.
- Full GUI `npm run test -w @kanmer/gui -- --run` exited 1: 41 files passed, 4 unrelated dispatch/provider suites failed on missing shared `antigravity`/dispatch parity, one dispatch expectation failed against that baseline, and Vitest reported one related temporary-log ENOENT. The focused CORE-048 suite is 16/16.
- `npm run typecheck -w @kanmer/gui` exited 1 on the pre-existing missing `dispatchDeliverableProven`, `verifyDeliverable` option/type, and `antigravity` provider errors in dispatch/providers.
- `npm run build -w @kanmer/gui` exited 1 on the same pre-existing missing `dispatchDeliverableProven` export from the core artifact.
- No hosted check result was available at handoff; PR #170 is open and requires independent review/hosted rerun. Live GitHub protection retargeting remains INCONCLUSIVE.

## Traceability

- Base: CORE-043 PR #168 head `1a06ead17cca8f7a6c715db3a6f6fed6b3de5da6`
- Commit: `8ffff2a0f8848bb42868559641b56148ba893ca6`
- Branch: `core-048-board-sync-gate`
- Worktree: `.worktrees/core-048`
- PR: #170 (https://github.com/collisionengineers/kanmer/pull/170), base `core-043-protection-retarget`
- Stop condition: Review-ready handoff; do not self-review, merge, or clean up.
