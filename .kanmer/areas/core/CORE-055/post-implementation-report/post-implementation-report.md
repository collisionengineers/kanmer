# CORE-055 post-implementation report

## Scope

Implemented only the CORE-054 remediation: a live `branchMismatch` now suppresses the ordinary board-branch rename loop as well as the protected-default refusal path. The current preference, live refs, and worktree remain unchanged until the administrator handoff is complete.

## Implementation

Base: CORE-054 PR #176 head `1ef6852a676266e1760f61a328e00a7be67fdcb0`

Changed exactly three GUI files:

- `apps/gui/src/main/kanmerGit.ts`: added `shouldAttemptOrdinaryBranchRename`, which requires no mismatch and a real current/target difference.
- `apps/gui/src/main/index.ts`: ordinary `applyGitPreferences` renames now use that predicate.
- `apps/gui/src/main/kanmerGit.test.ts`: extended the real-Git mismatch/no-mutation regression to cover a cached branch different from the saved preference; refs and worktree porcelain remain unchanged.

No provider, core, board-store, or plugin behavior was changed.

## Local evidence

- `npm run test -w @kanmer/gui -- --run src/main/kanmerGit.test.ts`: PASS, 20/20 (exit 0; 53.90s).
- `npm run check:manual`: PASS, manual up to date (22 chapters; exit 0).
- `npm run verify:docs`: PASS (3 remote chapters, 26 doctor ids; exit 0).
- `npm run build:core`: PASS (exit 0).
- `npm run test:scripts`: PASS, 89/89 (exit 0). An earlier parallel invocation raced the core build and failed with missing `packages/core/dist/index.js`; the sequential authoritative rerun after the successful core build passed.
- `git diff --check`: PASS (exit 0).

Broad workspace evidence is preserved rather than attributed to this change:

- `npm run test -w @kanmer/gui`: exit 1, 300/301 tests passed; 4 suites failed during collection because the checkout's shared dispatch provider `antigravity` is absent, plus the pre-existing dispatch expectation received `"antigravity" doesn't support background dispatch.`
- `npm run typecheck`: exit 1 on the existing shared-dispatch mismatch: `dispatchDeliverableProven` is not exported, `verifyDeliverable` is not an accepted option, its callback is implicit-any, and `"antigravity"` is not a `DispatchProviderId`.
- `npm run build -w @kanmer/gui`: exit 1 because `dispatchDeliverableProven` is not exported by `packages/core/dist/index.js`.
- These broad failures are outside CORE-055; the focused touched suite is green and reports no CORE-055 diagnostic.

## Review boundary

Hosted GitHub verification is INCONCLUSIVE until the PR is opened and its checks run. This lane does not claim live branch-protection or remote-host proof. The PR will remain open for independent review; I will not merge or self-review.
