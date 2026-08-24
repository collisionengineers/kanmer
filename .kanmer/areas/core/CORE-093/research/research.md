# Research — PR body edits and merge-gate freshness

## Findings

1. The `kanmer-gate` command reads `pull_request.body` and resolves the ticket from the `Kanmer:` footer. A body change can therefore change the gate result without changing the head SHA.
2. `.github/workflows/pr.yml` triggers only on `opened`, `synchronize`, `reopened`, and `ready_for_review`. It omits `edited`, leaving a prior check status stale after a footer edit.
3. `scripts/pr-workflow.test.mjs` is the existing dependency-free workflow contract rail. It needs a trigger assertion as well as the fetch/worktree assertions from [[CORE-092]].
4. `AGENTS.md` documents the authoritative verification rail but has no maintained contract for the separate `kanmer-gate` command, its board worktree, or the required workflow test.
5. Current `main` still has the board-fetch defect repaired by [[CORE-092]]. This implementation must be based on CORE-092’s review branch, so its own CI runs the corrected worktree setup without duplicating that change.

## Decision

Append `edited` to the `pull_request` trigger types. Add a short `AGENTS.md` section naming the source CLI, the required board worktree, the footer/body-edit relationship, and `scripts/pr-workflow.test.mjs` as the maintenance check. No gate-policy or executable change is required.
