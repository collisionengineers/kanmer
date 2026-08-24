# Post-implementation report — CI board-branch fetch ref

## Delivered

Commit `883db4ea` changes the pull-request `kanmer-gate` job to fetch:

```bash
refs/heads/$KANMER_BOARD_BRANCH:refs/remotes/origin/$KANMER_BOARD_BRANCH
```

The temporary board worktree now resolves `refs/remotes/origin/$KANMER_BOARD_BRANCH`, rather than assuming that a named fetch created `origin/$KANMER_BOARD_BRANCH`.

The workflow contract test now requires both ends of that mapping and rejects the prior unresolved-ref commands. The existing non-empty branch guard and separate-board safety check are unchanged.

## Scope

- Changed: `.github/workflows/pr.yml`, `scripts/pr-workflow.test.mjs`.
- Not changed: `check-pr.mjs`, gate policy, board contents, dependencies, Cloudflare configuration.

## Validation

| Command | Result |
| --- | --- |
| `node --test scripts/pr-workflow.test.mjs` | PASS — 1/1 |
| `npm run build:core` | PASS |
| `npm run test:scripts` | PASS — 98/98 |
| `node --test packages/mcp-server/src/check-pr.test.mjs` | PASS — 5/5 |
| `git fetch --no-tags origin "refs/heads/kanmer-board:refs/remotes/origin/kanmer-board"` followed by `git rev-parse --verify refs/remotes/origin/kanmer-board` | PASS — remote tracking ref resolved to `05ab991dbcdb9ed251b9d7549d04f2fddc92014c` |
| `git diff --check` | PASS |

The first broad script/CLI invocations in the fresh worktree exited 1 before testing their claims because `packages/core/dist/index.js` did not yet exist. After the required `npm run build:core`, both commands passed as recorded above; the initial setup failure is retained here rather than being represented as a test pass.

GitHub Actions itself will execute the workflow on the review PR; no CI configuration was changed locally beyond the guarded fetch/ref sequence.

## GitHub Actions evidence

PR [#233](https://github.com/collisionengineers/kanmer/pull/233) ran the repaired workflow. The required `kanmer-gate` job passed in 50 seconds, directly exercising the board-worktree fetch path.

At the time of handoff, the independent `verify` job remains pending; no outcome for it is claimed here.

## Review remediation — 2026-08-24

- Addressed PR #233 review finding P1: the contributor guide now documents the exact remote-tracking ref fetch and separate board worktree required by `kanmer-gate`.
- `node --test scripts/pr-workflow.test.mjs` — PASS, 1/1.
- `git diff --check` — PASS.
- The follow-up commit will be pushed to #233 and must receive a fresh hosted CI result before the authorized merge.
