# Files — CORE-037

## Where the change lands

| Path | Why |
|---|---|
| `apps/gui/src/main/kanmerGit.test.ts` | Add a test-local canonical path identity helper and use it for existing worktree path comparisons that are vulnerable to Windows 8.3 aliases. Preserve real Git commands and all branch/ref assertions. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `apps/gui/src/main/kanmerGit.ts` | `ensureBoardWorktree` and `inspectBoardWorktree` return resolved paths from both configured and Git-discovered inputs; production behavior is not in scope. |
| `apps/gui/src/main/kanmerGit.test.ts` | Real-Git fixture lifecycle, path assertions, 30-second per-test budget, and cleanup behavior that must remain intact. |
| `docs/functional/frd/FRD-020-board-git-worktree-sync.md` | Board worktree path stability and real branch/ref contract; no production API change is authorized. |
| `CORE-032` proof/report | The Windows GitHub failure: `RUNNER~1` versus `runneradmin` path spelling in the verify rail. |
| `GUI-075` `scratch/review.md` and `SKILL-021` `scratch/review.md` | Independent review blockers deferred to this remediation; their provider/skill scope must not be absorbed. |
| `packages/gui/package.json` and root verification scripts | Focused GUI test, workspace typecheck/build, and shared verification commands used for evidence. |

## Ripple effects

The focused GUI integration test should stop treating equivalent Windows path spellings as different while continuing to exercise Git worktree creation, branch rename, branch/ref preservation, and cleanup. CORE-032, GUI-075, and SKILL-021 can then rerun their own review/verification rails; no production bundle or board artifact changes are expected.

## Out of scope

- No changes to `apps/gui/src/main/kanmerGit.ts` production path values or Git commands.
- No changes to Git/worktree fixtures, branch/ref assertions, timeout budgets, cleanup policy, CI workflow, branch protection, GUI-075 dispatch behavior, or SKILL-021 prose.
- No weakening/deletion of assertions and no remediation of the separate local cleanup `EPERM`/hook-timeout failure unless it is independently reproduced as a path-identity defect.
