# CORE-043 research — protected board-branch rename

## Scope

CORE-043 closes the deferred CORE-033 finding that GUI board-branch rename can move the live board from the protected literal `kanmer-board` to an unprotected name. The change is limited to the GUI Git rename/reconciliation path, its deterministic Git integration tests, and the user/governing documentation that describes the supported flow. CORE-046 and any live GitHub/Cloudflare evidence are out of scope.

## Evidence from the current tree

- `apps/gui/src/main/kanmerGit.ts` renames the local worktree, pushes `HEAD:refs/heads/<new>`, then deletes the old remote branch. Push-before-delete is correct for history continuity, but the helper has no branch-protection knowledge.
- The same helper is called by `applyGitPreferences` for every open board and by `ensureBoardWorktree` when a closed project is reopened.
- `apps/gui/src/main/index.ts` currently persists the new global branch setting before applying the rename to open projects, so a refused rename must not be presented as a successful migration.
- `apps/gui/src/renderer/src/components/Settings.tsx` describes every rename as automatic and does not warn that the default branch is protected.
- `.github/workflows/pr.yml` fetches the literal `kanmer-board` branch for the merge gate. The checked-in FRD-020/ADR-0016 contract leaves GitHub protection as merge physics and explicitly excludes a GitHub App.
- `apps/gui/src/main/kanmerGit.test.ts` covers real local remotes and currently assumes `kanmer-board` can be renamed directly; those fixtures must distinguish the protected-default refusal from an already-retargeted custom branch.

## Decision

The GUI cannot safely retarget GitHub branch protection: it has no authenticated GitHub API seam, and adding one would violate ADR-0016's explicit out-of-scope boundary. Therefore the supported automatic flow is constrained. If the current worktree is on the protected default `kanmer-board` and the requested name differs, `renameBoardBranch` refuses before any local or remote Git mutation, with an operator-facing instruction to create/push the destination, retarget protection and required checks, confirm the old rule is gone, and then rename each local board worktree before changing the Kanmer setting. Renames from a non-default branch keep the existing history-preserving push-before-delete algorithm.

The settings application path must retain the old persisted branch when an open-worktree rename is refused, so the UI cannot report a new expected branch while the live board remains on `kanmer-board`. Reconciliation on project open uses the same refusal and remains visibly unavailable/paused until the operator completes the external retarget/local rename.

## Proof boundary

Local real-Git fixtures can prove no mutation on the protected-default refusal and preserve history/remote ordering for an already-retargeted custom branch. No local rail can prove a GitHub protection rule was retargeted; that live operation remains INCONCLUSIVE without authorized repository credentials and is recorded as such in the execution report.
