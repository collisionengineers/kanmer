# Files — SKILL-023

## Where the change lands

| Path | Why |
|---|---|
| `scripts/agents-block-body.mjs` | Add the compact 24-rule `## Agent conduct` section to the one canonical managed-body value. |
| `plugins/kanmer/skills/kanmer-setup/SKILL.md` | Update the fenced literal copy to exactly match the canonical body the plugin distributes. |
| `scripts/verify-agents-block.mjs` | Add named E2E assertions for the conduct section while retaining creation, refresh, idempotence, and exact-mirror checks. |
| `packages/core/src/staleness.test.ts` | Add/adjust a regression that an otherwise valid old managed block lacking the canon is reported as `agents-block: behind`. |
| `packages/mcp-server/src/smoke.mjs` | Review/update the stale-block scenario if needed so the public `get_status.repo` path is explicitly exercised against the old conduct-less body. |
| `AGENTS.md` | Refresh this repository's own managed block using the canonical writer, so verifier check 8 and the checked-in instructions do not lag the source. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `MASTERPLAN.md` §4 | The precise source of the 24 rules, their four group headings, and the instruction that the managed block carries one compact line per rule. |
| `MASTERPLAN.md` §6.4 S-27 | The ticket's intended scope and two acceptance checks: managed-block verifier green and old block reported `behind`. |
| `scripts/agents-block.mjs` | The writer preserves bytes outside markers, refreshes only the span, and is the only permitted way to update a checked-in managed block. |
| `scripts/verify-agents-block.mjs` | Existing E2E harness and the full-body equality guard for the setup skill/GUI import; new checks belong in its established `check()` style. |
| `packages/core/src/staleness.ts` | Reference body is discovered from the bundled setup skill and compared by content hash; do not hardcode or duplicate the new prose here. |
| `packages/core/src/staleness.test.ts` | Existing fixture conventions for `behind`, `unstamped`, `unknown`, and line-ending-normalised body hashes. |
| `packages/mcp-server/src/smoke.mjs` | Public-server smoke exercises `get_status.repo`; this is the integration-level evidence, not merely a core helper test. |
| `docs/functional/frd/FRD-013-setup-as-reconciliation.md` and `docs/architecture/adr/ADR-0015-staleness-by-content-not-version.md` | Preserve setup as the repair path and content-hash/discovered-reference semantics. |

## Ripple effects

- The canonical body change must reach the checked-in AGENTS block and the setup-skill fence in the same commit; otherwise `verify:agents-block` and repo staleness intentionally fail.
- The canonical body is included in the GUI and standalone server through source imports/skill discovery. Do not bake it into `staleness.ts` or add build-time content manifests, which ADR-0015 rejects.
- This is a skill-prose change. Follow the skills release rail: `npm run verify:agents-block`, relevant core/MCP tests and smoke, `npm run verify:skills`, then `npm run plugin:build` and `npm run plugin:check` from the main checkout as required by FRD-023 R5.

## Out of scope

- Writing the AGENTS skeleton/template ([[SKILL-024]], [[DOC-014]]), work-type briefs ([[SKILL-025]]), or the epic integration run ([[SKILL-026]]).
- Any new stage, gate, profile rule, automatic remediation, product version stamp, or new staleness state.
- Rewriting human-owned prose outside the managed markers or duplicating the conduct canon in additional writers.
