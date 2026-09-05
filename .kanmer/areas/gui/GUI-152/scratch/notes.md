## docs_todo stays true until the PR merges (2026-09-05)

`docs/functional/frd/FRD-036-focus-board.md` is written, but it exists only on
branch `GUI-152-focus-board-scopes` inside `.worktrees/GUI-152`. `update_item`
resolves `refs` against the repo root (`C:\Users\Alex\Documents\GitHub\kanmer`,
which is `main`) and refused with:

> Referenced document "docs/functional/frd/FRD-036-focus-board.md" does not exist
> under the repo root

So `docs_todo` is deliberately left `true`. The `leave-backlog` gate accepts
`docs_todo`, and the doc genuinely is still owed *to main*. Whoever merges the
PR should then set
`refs: [FRD-019, FRD-011, FRD-036] docs_todo: false`.
