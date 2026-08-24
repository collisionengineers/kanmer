# Post-implementation report — PR body edit merge-gate rerun

## Delivered

Commit `a40c027a`:

- adds `edited` to the `pull_request` activity types;
- extends `scripts/pr-workflow.test.mjs` to require that trigger, the board-ref mapping, and the documented gate contract;
- adds the `AGENTS.md` merge-gate convention: body/footer relationship, separate read-only board worktree, source command, and maintenance tests.

The branch is based on commit `883db4ea` from [[CORE-092]], which supplies the explicit board remote-tracking ref fetch. It does not duplicate or modify that parent change.

## Validation

| Command | Result |
| --- | --- |
| `npm run build:core` | PASS |
| `node --test scripts/pr-workflow.test.mjs` | PASS — 1/1 |
| `npm run test:scripts` | PASS — 98/98 |
| `node --test packages/mcp-server/src/check-pr.test.mjs` | PASS — 5/5 |
| `npm run verify:agents-block` | PASS — 31/31 |
| `git diff --check` | PASS |

## Hosted CI observation

PR #235’s initial `kanmer-gate` job reached and passed checkout, core build, ancestry fetch, explicit board-ref fetch, and separate-worktree checks. Its policy verdict correctly failed while CORE-093 was still Implementing and had an unnecessary live blocker from CORE-092. This report moves the ticket to Review and removes that blocker; an edited PR-body event will provide the final hosted trigger evidence.

## Body-edit trigger proof

A body-only edit to PR #235 preserved `Kanmer: CORE-093` and created GitHub Actions run `32715510795` for the unchanged head `a40c027a`. Its `kanmer-gate` job passed in 56 seconds, including the phase-2 command. This proves the `edited` trigger refreshes the gate when the body-derived ticket mapping can change.

The job emitted only the expected non-blocking `NO_REVIEW_RECORD` warning; independent review remains the next stage responsibility.

The same edited-body run completed with the full `verify` rail passing in 3m01s. Both required PR #235 checks are green.
