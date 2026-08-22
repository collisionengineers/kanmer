# CORE-054 post-implementation report

## Result

CORE-054 closes the CORE-052 P1 in which a live mismatch could leave the cached branch looking protected and still enter the protected refusal loop. The refusal decision is now mismatch-aware: any live mismatch blocks both the protected refusal rename and the ordinary rename path, preserving the current preference and live Git state.

## Scope and files

- apps/gui/src/main/index.ts: delegates protected refusal eligibility to the mismatch-aware predicate.
- apps/gui/src/main/kanmerGit.ts: adds shouldAttemptProtectedBranchRename, which fails closed when branchMismatch is true.
- apps/gui/src/main/kanmerGit.test.ts: adds a real-Git regression that snapshots refs and worktree porcelain before the mismatch decision and verifies both remain unchanged afterward.

## Traceability

- Parent implementation base: CORE-052 PR #175, head 825fb79dc3528b1d341f532ce8016aa0006624c8.
- CORE-054 branch: core-054-no-rename-mismatch.
- CORE-054 PR will target core-052-board-refresh-state as a stacked remediation child; no merge is performed by the author.
- CORE-052 cumulative lineage cannot be refreshed until its independent review and merge; this report records the exact pending parent head.

## Checks

- npm run test -w @kanmer/gui -- --run src/main/kanmerGit.test.ts: exit 0, 20/20 PASS.
- npm run check:manual: exit 0, manual current (22 chapters).
- npm run verify:docs: exit 0.
- npm run build:core: exit 0.
- npm run test:scripts: exit 0, 89/89 PASS.
- git diff --check: exit 0.
- npm run typecheck: exit 1 on the pre-existing shared-dispatch dispatchDeliverableProven/antigravity diagnostics in MCP server and GUI; no CORE-054 diagnostic.
- npm run build -w @kanmer/gui: exit 1 because the current core artifact lacks the unrelated dispatchDeliverableProven export consumed by GUI dispatch; no CORE-054 diagnostic.
- Live GitHub protection retargeting remains INCONCLUSIVE and is not claimed.

## Review handoff

Ready for independent review as a stacked child of CORE-052. The author will not review or merge this PR.
