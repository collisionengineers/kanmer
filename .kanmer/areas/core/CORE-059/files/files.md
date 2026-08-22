# Files map — CORE-059

## Change surface

| File | Expected change | Risk / proof |
|---|---|---|
| `apps/gui/src/main/kanmerGit.ts` | Keep the previous remote ref for custom-to-custom renames and return an operator-facing warning; retain protected-default refusal. | Remote refs and error semantics are safety-critical; prove with real bare-origin fixtures. |
| `apps/gui/src/main/kanmerGit.test.ts` | Update the rename fixture to assert both refs remain and add the warning contract. | Prevents regression to deleting the gate's configured ref. |
| `docs/manual/board-sync.md` | Explain that a custom rename waits for the administrator to retarget `KANMER_BOARD_BRANCH` before old-ref cleanup. | Keeps user procedure aligned with the workflow variable. |
| `docs/manual/troubleshooting.md` | Add the corresponding recovery instruction for a retained old remote ref. | Avoids a contradictory repair path. |
| `apps/gui/src/renderer/src/manual/chapters.generated.ts` | Regenerate the shipped manual after source manual edits. | Packaged/manual parity must remain deterministic. |

## Context files

| File | Why it matters |
|---|---|
| `docs/functional/frd/FRD-020-board-git-worktree-sync.md` | Defines push-before-delete and the board-worktree rename contract. |
| `docs/architecture/adr/ADR-0016-compiled-workflow.md` | Keeps GitHub protection and merge physics outside the GUI; no hidden API update may be invented. |
| `.github/workflows/pr.yml` | The hosted gate's `KANMER_BOARD_BRANCH` source and fallback. |
| `apps/gui/src/main/index.ts` | Applies rename results to open contexts and schedules sync. |
| `AGENTS.md` | Repository operating rule requiring conventions to be recorded in the same change; CORE-061 owns its update. |

## Ripple effects and out of scope

Tests, manual generation, and review/verify packets must record the retained-ref handoff. Updating GitHub repository variables, deleting the old ref after operator confirmation, or changing protected-branch policy is out of scope because no authorized GitHub API is available in the application.
