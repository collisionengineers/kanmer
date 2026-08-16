## Paused before push/PR

`kanmer-execute` step 3 is push + `gh pr create`. Not done, and it needs a
decision rather than a retry.

The base branch `v3-phase-minus-1-prework` is **19 commits ahead of origin/main
and unpushed**. `gui-005-format-3-migration-prompt` branches off it, so a PR
opened now would show 20 commits — the 19 that carry all of v3 Phases 0–5, plus
this one. That is not a reviewable PR, and pushing it publishes the whole v3
line to the remote.

Resume point: worktree `.worktrees/gui-005`, branch
`gui-005-format-3-migration-prompt`, commit `e489da7`. Ticket stays taken.

Options for whoever picks this up:
- push `v3-phase-minus-1-prework` first, then this branch PRs cleanly against it
- or keep the whole line local and treat `review` as a local review stage
