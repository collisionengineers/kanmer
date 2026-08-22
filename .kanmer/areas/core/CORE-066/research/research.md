# Research

## Finding

At cumulative CORE-058 head `b8d8a191`, first-time local/remote attachment calls `ensureBoardWorktreeIgnore(boardRoot)` outside a guarded path. A deterministic `.gitignore` failure falls through the outer catch and returns `empty(branch, error)`, losing the known canonical root.

## Expected behavior

Local, remote, existing, and renamed attachment paths must all retain `boardRoot` and return an actionable paused/error status when ignore reconciliation fails.

## Constraints

Reuse the existing status shape and reconciliation helper; add deterministic real-Git coverage and no dependencies.
