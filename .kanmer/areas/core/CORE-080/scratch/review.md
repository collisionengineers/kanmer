# Independent review — CORE-080

- Verdict: NEEDS-CHANGES
- Reviewed head: 0e1be5f32efad1da57ee27bd2a2fe80033976bd1
- PR: #201 (stacked on core-043-protection-retarget)
- Scope reviewed: manual Retry live-branch preflight, mismatch no-mutation behavior, genuine paused-error preservation, retained custom-ref documentation, generated/manual/FRD parity.

## Evidence

- `npm run test -w @kanmer/gui -- src/main/kanmerGit.test.ts --reporter=dot`: exit 0, 26/26.
- `npm run test -w @kanmer/core -- --run --reporter=dot`: exit 0, 283/283.
- `npm run test:scripts`: exit 0, 89/89.
- `npm run verify:skills`: exit 0.
- `npm run verify:docs`: exit 0.
- `npm run check:manual`: exit 0.
- `npm run typecheck -w @kanmer/gui`: exit 0 in this clean worktree.
- `git diff --check`: exit 0.
- No hosted checks are configured for this stacked non-main target; PR is CLEAN/MERGEABLE.

## Findings

### F-001 — NEEDS-CHANGES: production Retry caller is not regression-tested

The plan and acceptance checks explicitly require tests to prove the named production caller path, not only an isolated helper. The implementation correctly places `preflightBoardSync` before `syncBoard` in `syncProject` for manual and automatic paths, and the helper tests prove the preflight state transitions. However, the added tests invoke `preflightBoardSync` directly; none invokes the `syncProject`/IPC Retry caller with a mismatched live branch while asserting that `syncBoard` is not called and no refs are mutated. Add a focused production-caller regression (or an equivalent test of the registered IPC handler) covering mismatch early return, and retain the existing helper assertions.

## Non-findings / dispositions

- Mismatch handling is fail-closed in the inspected `syncProject` caller: preflight precedes sync and returns before `syncBoard` when `branchMismatch` is true.
- Matching saved branch preserves genuine paused/error state through `refreshBoardBranch`; this is covered by the 26-test rail.
- Retained old custom remote-ref semantics are consistently reflected in FRD-020, board-sync manual, and generated manual; `verify:docs` and `check:manual` pass.
- No unrelated source scope or dependency changes were found.
- The report’s prior GUI typecheck/full-GUI failures are environment-sensitive/stale-core evidence; current GUI typecheck passes and they are not the reason for this verdict.
- External GitHub protection/hosted-variable mutation remains INCONCLUSIVE by scope and is correctly deferred.

Do not merge or move CORE-080 until F-001 is addressed and re-reviewed at a new exact head.
