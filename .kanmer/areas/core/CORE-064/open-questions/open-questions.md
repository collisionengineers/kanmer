# Open questions

## Resolved

- [x] Should the board root survive a post-rename ignore failure? Yes; otherwise callers can reopen the source checkout.
- [x] Should this be a new abstraction? No; reuse `KanmerGitStatus` and the existing reconciliation helper.

## Parked (explicitly deferred)

- No external Windows lock/permission proof is available in this local run; retain as an explicit verification limitation.
