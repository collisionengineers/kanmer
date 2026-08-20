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

---

# Re-review — SKILL-023 / PR #77

Independent re-review after remediation; I am not the implementation author.

## Remediation verified

- Commit `395e0e5` merges then-current `origin/main` into the PR branch.
- Commit `f2071db` regenerates `plugins/kanmer/mcp/kanmer-mcp.cjs`. Its diff now carries the merged `STALENESS_PROVIDER_PATHS` object and derives both skill destinations and registration files from it, matching the current core source.
- The post-implementation report now lists the plugin bundle and explains why it was regenerated. This resolves the prior report-completeness comment.

## Checks run independently

In a fresh, non-linked clone of the exact PR head:

- `npm ci` completed.
- `npm run plugin:build` completed.
- `npm run plugin:check` passed: 30 tools match, bundle bytes match, and 12 skill frontmatters parse.
- `npm run verify:agents-block` passed: 31/31.
- `npm test -w @kanmer/core -- staleness.test.ts` passed: 40/40.
- `npm run verify:skills` passed.
- `node packages/mcp-server/src/smoke.mjs` passed: 159/159.
- `git diff --check origin/main...HEAD` passed; the standalone checkout stayed clean.

## Comments and disposition

1. **Blocking bundle/source mismatch from the prior review — fixed in PR.** The rebase and regenerated bundle now agree with the merged provider-path source, and the canonical-byte release rail passes independently.
2. **Post-implementation-report bundle omission — fixed in ticket documentation.**
3. No other correctness, scope, governance, or open-question issue found. The implemented conduct canon and its tests continue to meet the ticket plan, FRD-013, ADR-0015, FRD-023, and the EPIC-012 outcome.

## Verdict

**Pass.** The former blockers are resolved. Per the requested review-only scope, PR #77 remains open and SKILL-023 remains in Review; no merge or stage move was performed.
