# Research — CORE-063

## Question

What state must `ensureBoardWorktree` return when an already-attached board worktree is known but its `.gitignore` cannot be reconciled?

## Findings

1. CORE-058's `attached` path resolves the known worktree and calls `ensureBoardWorktreeIgnore` inside the outer `try`.
2. Any ignore write/lock/permission error falls into the outer catch, which returns `empty(branch, error)`. That discards `boardRoot`, `available`, and the fact that the caller is attached to a real board worktree.
3. `main/index.ts` uses `boardRoot` to choose the store root; an empty result can make the GUI fall back to the source checkout, risking edits in the wrong board location. The error is also not represented as paused/retryable state.
4. The attached path has enough information to preserve `attachedRoot` even when reconciliation fails. A deterministic injectable failure seam or locked fixture is needed to prove this without swallowing the error.

## Implications

Handle attached-worktree ignore reconciliation as a bounded failure: return the known resolved `boardRoot`, `available: false` (or an equivalent non-usable status), the requested branch, a surfaced error, and `paused: true` so callers do not fall back to the source checkout and operators see Retry/repair guidance. Keep successful attachment unchanged and preserve the original error.
