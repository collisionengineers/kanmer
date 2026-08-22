# Open questions

## Resolved

- [x] Must first-time local and remote attachments retain the root? Yes; they are canonical as soon as `worktree add` succeeds.
- [x] Should the failure fall back to the source checkout? No; that risks mutating the wrong board.

## Parked (explicitly deferred)

- External Windows lock/permission and hosted evidence remain unavailable locally.
