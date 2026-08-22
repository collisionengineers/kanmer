## Independent review — NEEDS-CHANGES

Reviewed exact PR #175 head `825fb79dc3528b1d341f532ce8016aa0006624c8` against base `11930038542d402865bb26a23787d7d3cad3e2c5`. The scoped diff, governing-document references (FRD-020 and ADR-0016), and deterministic local rails were inspected independently.

### P1 — mismatch path still auto-renames the observed branch

`refreshBoardBranch(status, requestedBranch)` correctly leaves the cached branch at `kanmer-board` and sets `branchMismatch=true` when the live worktree is on an unexpected branch. However, `applyGitPreferences` then computes `protectedOpenBoard` from the unchanged cached branch and enters its `if (protectedOpenBoard)` branch. That branch unconditionally calls `renameBoardBranch(ctx.syncStatus.boardRoot, requestedBranch)`. Therefore a worktree observed on an arbitrary branch can still be renamed automatically, contrary to the report and the ticket requirement to retain the current preference and perform no automatic rename on mismatch. The fix must make the mismatch path block/refuse before the protected refusal loop (and add an integration regression proving the unexpected branch, refs, and worktree remain unchanged).

### Checks

- `npm run test -w @kanmer/gui -- --run src/main/kanmerGit.test.ts`: exit 0, 19/19.
- `npm run check:manual`: exit 0.
- `npm run verify:docs`: exit 0.
- `node --test scripts/release-flow.test.mjs`: exit 0, 5/5.
- `npm run test:scripts`: exit 0, 89/89 after the documented core build prerequisite.
- `git diff --check`: exit 0.
- Full GUI/typecheck/build and live protection/manual interaction evidence remain the report's documented baseline or INCONCLUSIVE boundaries; they do not change this source finding.

### Verdict

NEEDS-CHANGES. Do not merge PR #175 until the mismatch branch is proven not to be renamed and the regression is added.
