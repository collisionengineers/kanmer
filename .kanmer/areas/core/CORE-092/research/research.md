# Research — CI board-branch fetch ref

## Finding

The current `origin/main` already tracks `packages/mcp-server/src/check-pr.mjs`; its absence in the review was caused by the stale local checkout. No CLI source or gate semantics need changing.

The live `kanmer-gate` job still uses:

```bash
git fetch origin "$KANMER_BOARD_BRANCH"
git worktree add "$RUNNER_TEMP/kanmer-board" "origin/$KANMER_BOARD_BRANCH"
```

A named `git fetch` is guaranteed to update `FETCH_HEAD`, but is not guaranteed to create/update `refs/remotes/origin/<branch>`. The subsequent worktree therefore resolves a revision that may not exist in a shallow pull-request checkout.

## Required correction

Fetch an explicit refspec from `refs/heads/$KANMER_BOARD_BRANCH` to `refs/remotes/origin/$KANMER_BOARD_BRANCH`, then pass that exact remote-tracking ref to `git worktree add`.

This preserves the existing job’s read-only board access, branch-name check, temporary worktree location, and separate-board safety check.

## Constraints

- Change only `.github/workflows/pr.yml`.
- Do not alter `check-pr.mjs`, ticket-gate semantics, or Cloudflare work.
- The workflow must continue to read the board branch without creating or pushing it.
- The source change must be covered by a focused workflow contract check and existing CLI tests.
