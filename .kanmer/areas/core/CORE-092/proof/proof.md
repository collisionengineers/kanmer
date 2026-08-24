# Proof — CORE-092

## Merged artifact

- PR #233 merged into `main` at `72677b3a56ff90427ae5b67a1797e5a8cce6c74e` on 2026-08-24.
- The merged workflow explicitly fetches `refs/heads/$KANMER_BOARD_BRANCH` into `refs/remotes/origin/$KANMER_BOARD_BRANCH`, then creates the separate board worktree from that exact ref.
- The contributor guide on merged `main` documents the same contract and directs future changes to the workflow contract test.

## Hosted CI

- GitHub Actions run `32719005668` on the remediation head: `kanmer-gate` PASS (53s) and `verify` PASS (3m16s).

## Merged-main commands

Run in `C:\Users\Alex\Documents\GitHub\kanmer\.worktrees\core-092` detached at `origin/main` (`72677b3a`):

| Command | Result |
| --- | --- |
| `npm run build:core` | PASS, exit 0 |
| `node --test scripts/pr-workflow.test.mjs` | PASS, 1/1 |
| `node --test packages/mcp-server/src/check-pr.test.mjs` | PASS, 5/5 |

No secrets, board data, or provider configuration were changed.

## Closeout record

- Merged PR: [#233](https://github.com/collisionengineers/kanmer/pull/233)
- Merge date: 2026-08-24
- No deployment is tracked for this repository-only CI remediation.
