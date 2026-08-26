# Checklist

- [x] Confirm PR #281 final head has an independent pass, green required checks, and merges into main; confirm #282 merge SHA remains reachable.
- [x] Create and validate the clean CORE-111 release worktree from current origin/main without touching the dirty source root.
- [x] Write v0.3.12-only stabilization release notes.
- [x] Run the complete real release command for 0.3.12 and preserve every command exit.
- [x] Verify plugin/MCP synchronization and all local/remote installer, blockmap, updater-manifest, size, and SHA-256 evidence.
- [x] Run supported installed launcher/Connect smoke and pin packaged v0.3.12 as the live server.
- [x] Reconcile GUI-142, MCP-053, and CORE-111 with exact GitHub and board state.
- [x] Write proof and clean the recorded release branch/worktree/claim; the separately created disposable clone remains only because the environment rejected recursive deletion outside the workspace.

---

## Closeout — CORE-111

- [x] PR merge verified (`gh pr view --json state,mergedAt`)
- [x] proof.md finalised (PR URL + merge date appended)
- [x] Moved to final stage
- [x] Outcome recorded in ticket body (PR link, follow-ups)
- [x] cd out of worktree; `git worktree remove .worktrees/core-111`
- [x] `git branch -d core-111-release-v0-3-12` (`-D` after confirmed squash merge)
- [x] `git fetch --prune` + `git worktree prune`
- [x] `take_ticket action: "release"` (issued after this closeout record)
