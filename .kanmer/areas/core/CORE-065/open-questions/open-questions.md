# Open questions

## Resolved

- [x] May a failed reconciliation be represented as unavailable? It may be unavailable for sync, but must remain a distinct retryable state with `boardRoot`.
- [x] Should retry create a new worktree? No; retry the existing canonical path in place.

## Parked (explicitly deferred)

- No live Windows lock/permission or hosted UI proof is available in the local verification environment.
