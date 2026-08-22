# Files — CORE-080

## Where the change lands

| Path | Why |
|---|---|
| `apps/gui/src/main/index.ts` | Preflight the live board branch for manual Retry before invoking the existing sync routine. |
| `apps/gui/src/main/kanmerGit.test.ts` | Add a regression covering manual-retry/live-branch mismatch and preserve protected/default and paused-error behaviour. |
| `docs/functional/frd/FRD-020-board-git-worktree-sync.md` | Align R5 and acceptance wording with retained old refs until the hosted branch variable is updated. |
| `docs/manual/board-sync.md` | Keep the operator handoff and Retry guidance consistent with the implementation. |
| `checklist/checklist.md` | Track independently verifiable implementation and verification steps. |
| `plan/plan.md` | Record the bounded implementation and evidence plan. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `apps/gui/src/main/kanmerGit.ts` | Existing `inspectBoardWorktree`, `refreshBoardBranch`, `syncBoard`, and mismatch flags; reuse these contracts. |
| `apps/gui/src/main/syncBranch.ts` | Exact live-branch predicate and user-facing mismatch error. |
| `apps/gui/src/main/syncTimer.ts` | Automatic sync scheduling boundary; manual Retry must not bypass the same safety invariant. |
| `docs/architecture/adr/ADR-0016-compiled-workflow.md` | Observation/repair separation and branch-health rules. |
| `CORE-043` review packet and PR #168 | Parent scope, prior remediations, and the independent findings this ticket closes. |

## Ripple effects

The GUI main-process retry path and its tests change; the FRD/manual generated or embedded manual surface must remain synchronized if the repository's manual build requires regeneration. The change is layered on CORE-043's branch-handoff implementation and must be reviewable as a separate remediation.

## Out of scope

No changes to GitHub protection, Actions variables, MCP transport, core storage, remote tunnel behaviour, or the protected-default administrator handoff itself.
