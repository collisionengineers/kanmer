# Files map — CORE-063

## Change surface

| File | Expected change | Risk / proof |
|---|---|---|
| `apps/gui/src/main/kanmerGit.ts` | Preserve `boardRoot` and surfaced paused/error state when attached ignore reconciliation fails. | Wrong-root fallback is a data-integrity risk; prove exact returned status. |
| `apps/gui/src/main/kanmerGit.test.ts` | Add a deterministic attached-path reconciliation failure regression using the existing command/seam strategy. | Must prove no source-root fallback and no swallowed error. |
| `apps/gui/src/main/index.ts` / renderer IPC | Read as context; change only if the typed status contract needs to surface the preserved root. | Avoid unrelated GUI behavior changes. |

## Context files

| File | Why it matters |
|---|---|
| `apps/gui/src/main/kanmerGit.ts` | Defines status shape, attached worktree discovery, ignore reconciliation, and failure catch. |
| `apps/gui/src/main/kanmerGit.test.ts` | Real-Git fixture and bounded test helpers; use deterministic seams rather than flaky OS locks. |
| `apps/gui/src/main/index.ts` | Chooses board store root from `boardRoot`; wrong fallback is the critical hazard. |
| `docs/functional/frd/FRD-020-board-git-worktree-sync.md` | Board worktree must remain canonical and conflicts/errors must be visible. |
| `docs/functional/frd/FRD-027-project-declared-sources.md` | Cache ignore/reconciliation is part of the source trust boundary. |

## Ripple effects and out of scope

No new retry engine, GitHub API, provider/source-fetch change, or retroactive cache cleanup is in scope. Any typed IPC update must remain backward-compatible and be covered by the existing GUI rails.
