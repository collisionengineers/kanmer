# Files — CORE-032

## Where the change lands

| Path | Why |
|---|---|
| `.github/workflows/pr.yml` | New and only implementation file. Define the pull-request event contract, least-privilege permissions, Bash default, single Windows `verify` job, Node 20 setup, and the one `npm ci && npm run verify` execution step. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `scripts/verify.mjs` | The sole verification command definition delivered by CORE-031. The workflow must call it through `npm run verify`, never duplicate its steps. |
| `package.json` | Declares Node `>=20`, the workspaces, the root `verify` command, and the deterministic leaf scripts reached by the job. |
| `package-lock.json` | Makes `npm ci` valid and deterministic; no lockfile rewrite should occur in this ticket. |
| `scripts/check-plugin-sync.mjs` | Confirms the GitHub checkout is a suitable normal checkout for the final verification step and that no plugin rebuild belongs in CI. |
| `apps/gui/src/main/kanmerGit.test.ts` | One of the Windows-sensitive suites that makes `windows-latest` intentional; GUI-085 separately stabilizes its timing before protection. |
| `packages/core/src/discover.test.ts` | Exercises path/root discovery whose Windows behaviour should not be replaced with Linux-only confidence. |
| `MASTERPLAN.md` | S-02 and Appendix A fix the job name, event types, shell, runner, permissions, command, and prohibition on a gate stub. |
| `.kanmer/groups/EPIC-009/context.md` | Restricts this change to the compiled-workflow spine and identifies protection as a later ticket. |

## Ripple effects

- The displayed job/check name becomes the string CORE-033 records and later requires through branch protection; avoid renaming it after first use.
- CORE-024 will extend the same workflow with a real `kanmer-gate` job after its evaluator exists. The workflow-level Bash default is deliberately compatible with that addition.
- The implementation PR itself should produce the first `verify` run. Its duration is the baseline for the `<10 min` target.
- Because no `push` trigger exists, ordinary direct commits on `kanmer-board` remain outside Actions.
- A failure in any leaf command now appears before merge instead of only during release; fixes belong to the failing owner ticket, not to weakening this workflow.

## Out of scope

- Branch/ruleset protection, required-check configuration, conversation-resolution rules, bypasses, or repository settings.
- A `kanmer-gate` placeholder, PR-body parsing, board-branch fetch, or write permissions.
- Push, schedule, manual-dispatch, merge-group, tag, release, or board-branch workflows.
- Caching, matrices, Linux/macOS runners, retries, artifact uploads, annotations, coverage publishing, or test sharding.
- Changes to `scripts/verify.mjs`, package scripts, lockfile, tests, plugin bundle, or application code.
