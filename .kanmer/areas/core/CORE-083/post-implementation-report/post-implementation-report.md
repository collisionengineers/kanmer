# CORE-083 post-implementation report

## Outcome

CORE-083 is implemented on cumulative CORE-026 base a9833df28ddf6f91966be17a4eb7c06265e088ed. Orphan migration now records a deterministic fingerprint of the source .kanmer tree, verifies the copied board and live source immediately before source cleanup, and fails closed with paused/error while retaining both trees when the versions differ or the marker is invalid. Source-root ignore reconciliation failures now retain the established canonical boardRoot instead of returning a null root that could trigger source-root fallback.

## Changed files

- apps/gui/src/main/kanmerGit.ts: added deterministic directory fingerprinting and versioned orphan marker contents; guarded copied-source and live-source comparisons before git rm; retained boardRoot across source-root ignore failures.
- apps/gui/src/main/kanmerGit.test.ts: added real-Git regressions for source-version conflict preservation and source-ignore refusal; updated the prior retry case to assert the new fail-closed behavior when a retry sees a changed source version. All inherited board/lock/ignore assertions remain present.

## Governing-doc mapping and scope

The implementation follows FRD-027-project-declared-sources.md and ADR-0020-project-declared-source-trust.md. It is limited to the two CORE-026 review findings 3836536180 and 3836536184. No source resolver, provider, lock, migration, parent-ticket stage, or unrelated GUI behavior was changed.

## Verification (exact outcomes)

- npx vitest run apps/gui/src/main/kanmerGit.test.ts -t "orphan|source ignore": exit 0; 4 passed, 26 skipped.
- npx vitest run apps/gui/src/main/kanmerGit.test.ts --reporter=verbose: exit 0; 30/30 tests passed in 105.06s.
- npm run typecheck -w @kanmer/gui: exit 0.
- npm run build -w @kanmer/gui: exit 0.
- npm run test:scripts first attempt: exit 1 because this fresh worktree had no packages/core/dist/index.js; 86/88 script tests passed and the two missing-dist failures are preserved as the first failure.
- npm run build:core: exit 0.
- npm run test:scripts after the prerequisite build: exit 0; 88/88 passed.
- git diff --check: exit 0.
- npm test -w @kanmer/gui: started the full GUI suite but was interrupted after the run stalled without completion; this remains INCONCLUSIVE, not PASS.

## Risks and remaining evidence

The fingerprint check closes the observed copy-to-cleanup version window and deterministic tests prove source and canonical board state are retained on mismatch. A live multi-process edit occurring after the final fingerprint read, packaged GUI fallback behavior, and network/filesystem race behavior were not available in this local rail and remain INCONCLUSIVE. The verifier should rerun the focused and full GUI rails on merged main, then write proof.md; no post-merge proof is claimed here.

## Handoff

- Commit: ff12510be5608a6b940f15c00e2cb68dc0266267
- PR: #211, targeting core-026-project-declared-sources
- Branch/worktree: core-083-orphan-board-state / .worktrees/core-083
- Stop condition: Review; author does not self-review, merge, verify, or clean up.
