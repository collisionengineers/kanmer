---
status: draft
covers: shipped Phase 9 feature (backfill)
---

# FRD-020 — Board Git worktree & auto-sync

The board can live on its own branch, shared across machines, without ever touching your source branch.

- R1. The board root is `<repo>/.worktrees/kanmer`, checked out on a configurable branch (default `kanmer-board`, global setting); the source checkout remains the project tab. MCP calls receive the board root; agent execution and project config use the source root.
- R2. First-time setup migrates an existing `.kanmer/` to the branch only after a successful commit; source-branch cleanup is left **staged and visible**, never auto-committed. `.kanmer/` and `.worktrees/` are gitignored at the source; `activity.jsonl` is ignored on the board branch.
- R3. **Automatic sync** (off by default; whole-minute interval): add scoped to `.kanmer` + the board `.gitignore` → commit if dirty → fetch/rebase if the remote branch exists → push. Never `--force`, never any other branch; a rebase conflict aborts, preserves local commits, and **pauses that project** with a visible error + Retry. "Sync now" always available.
- R4. Branch rename migrates all known projects safely (push new before deleting old; worktree path unchanged so MCP registrations stay valid). Non-Git folders keep colocated `.kanmer/` with sync shown unavailable.

**Acceptance (as-built):** the Phase 9 verification list — real-repo tests for orphan creation, migration byte-preservation, conflict pause, rename, and cross-machine recovery.

Related: docs/plans/kanmer-v2/phase-9 · kanmerGit.ts · FRD-018 (watcher picks up synced changes).
