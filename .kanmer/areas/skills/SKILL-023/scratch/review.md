# Review — SKILL-023 / PR #77

Independent review; I am not the implementation author.

## Changes inspected

- Adds the 24-rule Agent conduct canon in Scope, Build, Prove, and Conduct groups to the canonical managed-block body, its setup-skill mirror, and this repository’s marker-delimited `AGENTS.md` body.
- Extends the agents-block lifecycle verifier with explicit heading, ordered-rule, and group checks.
- Changes the staleness regression fixture to the otherwise-valid former body without Agent conduct.
- Updates the committed plugin MCP bundle.

## Comments and disposition

1. **Blocking — rebase PR #77 onto current `main` and regenerate the plugin bundle.** Since the branch forked, PR #76 changed `packages/core/src/staleness.ts` to export and consume `STALENESS_PROVIDER_PATHS`. The submitted bundle still contains the older direct `SKILL_DESTINATIONS` array (with only the `.claude/skills` entry removed). A merge-tree inspection preserves that stale bundle beside the newer source, and a fresh standalone build does not match it. This would fail the FRD-023 release bundle rail and ship the source/bundle disagreement. **Disposition:** needs correction in this PR: rebase, run `npm run plugin:build`, then run `npm run plugin:check` from the canonical main checkout as required by its linked-worktree guard. Add the regenerated bundle to the report’s change table.

2. **Non-blocking — report completeness.** The post-implementation report’s change table omits `plugins/kanmer/mcp/kanmer-mcp.cjs`, even though it is in the PR. The rebased/regenerated bundle should be described as the release artifact synchronized with the merged source. **Disposition:** fixed alongside comment 1.

No other correctness, governance, question-resolution, or scope issue was found. The conduct content, explicit lifecycle checks, and conduct-less staleness fixture match the ticket plan, FRD-013, ADR-0015, FRD-023, and the EPIC-012 outcome.

## Checks run

- `npm run verify:agents-block` — 31/31 passed.
- `npm test -w @kanmer/core -- staleness.test.ts` — 40/40 passed.
- `npm run verify:skills` — all checks passed.
- `node packages/mcp-server/src/smoke.mjs` — 159/159 passed.
- `git diff --check origin/main...HEAD` — clean.
- `npm run build` in the isolated PR worktree completed, but the resulting standalone bundle did not match the checked-in plugin bundle. Per the documented linked-worktree guard, `plugin:check` itself must be rerun by the author from the canonical main checkout after the rebase; I did not treat a linked-worktree bundle check as valid evidence.

## Verdict

**Needs changes.** Do not merge or advance the ticket until PR #77 is rebased onto current `main`, the plugin bundle is regenerated and passes the canonical-main release rail, and the report records that artifact update.
