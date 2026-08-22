# Post-implementation report — CORE-037

## Summary

The real-Git GUI integration tests now compare existing worktree filesystem identity rather than Windows path spelling. A test-local helper uses Windows `realpathSync.native` and only falls back lexically for missing paths; production Git/worktree behavior and the actual branch/ref assertions are unchanged.

## Changes

| File | Change | Why |
|---|---|---|
| `apps/gui/src/main/kanmerGit.test.ts` | Added `pathIdentity` with native Windows realpath and ENOENT/ENOTDIR fallback; replaced three existing-worktree path equality comparisons; documented the hosted-Windows 8.3 alias case. | Treat `RUNNER~1` and `runneradmin` as the same existing filesystem location while continuing to reject genuinely different paths and exercising real Git. |

No production source, fixture, CI, package, lockfile, timeout, cleanup, or board artifact changed.

## Governing docs

`docs/functional/frd/FRD-020-board-git-worktree-sync.md` is satisfied: the board worktree path remains stable (R1/R5), and the test continues to exercise real worktree creation, branch rename, refs, and cleanup. The FRD and production path reporting were not modified.

## Risks / follow-ups

- Baseline local focused run before the change: 11/12 passed; `renameBoardBranch > refuses a name that is already taken` exceeded the 10-second hook timeout and cleanup raised Windows EPERM. This remains recorded and was not relabelled.
- The focused rerun after the change passed 12/12. Full GUI passed 37 files/352 tests; GUI typecheck, GUI build, and `git diff --check` passed.
- Shared `npm run verify` passed core 263/263, GUI 352/352, HTTP 61/61, scripts 80/80, typecheck, stdio 224/224, headless smoke and related checks, then failed at `mcpb:check` because this fresh worktree lacks `node_modules/@anthropic-ai/mcpb/dist/cli/cli.js`. No dependency or lockfile change was added to repair that unrelated environment condition.
- CORE-032, GUI-075, and SKILL-021 retain their own review/verification records and should rerun their required GitHub rail after this PR; no provider, skill, CI workflow, or branch-protection scope was absorbed.

## Verification hand-off

On merged `main`, run:

- `npm test -w @kanmer/gui -- src/main/kanmerGit.test.ts --run`
- `npm test -w @kanmer/gui`
- `npm run typecheck -w @kanmer/gui`
- `npm run build -w @kanmer/gui`
- `git diff --check`
- the shared `npm run verify` rail in a dependency-complete checkout, preserving any pre-existing failures and confirming the GitHub Windows check no longer fails on equivalent temp-path spellings.

Proof should record the merged SHA, exact exit codes/test counts, and any remaining cleanup EPERM or dependency-environment failure. No screenshot or visual evidence applies to this test-only fix.
