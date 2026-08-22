# Research

## Finding

PR #180 review at `b1abac871da28522759d4e5582caa69d5cdb5cd5` found that an attached-worktree ignore failure returns `available: false`, `boardRoot`, and `paused: true`. The GUI status surface treats that as non-Git and `syncBoard` short-circuits on `available`, so repairing `.gitignore` cannot be retried without reopening the project.

## Expected behavior

The failed-Git state must remain visibly distinct from “not a Git repository,” preserve the canonical board root, surface the error, and provide a retry/reconciliation path that is idempotent after repair.

## Constraints

Reuse the existing status/IPC/settings flow, avoid fallback to the source checkout, and add deterministic status/UI or integration coverage without external services.
