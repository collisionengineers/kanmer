# Post-implementation report — SKILL-023

## Summary

The managed AGENTS.md block now ships MASTERPLAN §4’s 24-rule Agent conduct canon in four compact groups. The canonical source, standalone setup-skill fallback, this repository’s installed block, lifecycle verifier, and content-hash staleness regression all agree; existing repositories with the former conduct-less body are detected as behind and repaired only through setup.

## Changes

| File | Change | Why |
|---|---|---|
| `scripts/agents-block-body.mjs` | Added the compact `## Agent conduct` section with rules 1–24 under Scope, Build, Prove, and Conduct. | Keeps the canon in the single writable managed-block source. |
| `plugins/kanmer/skills/kanmer-setup/SKILL.md` | Mirrored the canonical conduct section inside the fenced managed block. | Preserves the plugin-only fallback and the verifier’s byte-for-byte contract. |
| `AGENTS.md` | Refreshed only the managed marker span using `scripts/agents-block.mjs`. | Keeps this repository on the canonical block without editing human-owned prose. |
| `scripts/verify-agents-block.mjs` | Added named lifecycle assertions for the heading, all 24 ordered rules, and four canon groups. | Makes the conduct delivery contract visible rather than relying only on whole-body inclusion. |
| `packages/core/src/staleness.test.ts` | Changed the managed-block drift fixture to an otherwise valid former body without `## Agent conduct`. | Proves content-hash staleness reports the actual upgrade shape as `agents-block: behind` without changing detector logic. |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | Regenerated after merging current `main`, then byte-verified against a fresh standalone build. | Keeps the committed plugin runtime synchronized with the merged core staleness source. |

## Governing docs

This feature remains intentionally `docs_todo: true`: MASTERPLAN §4 and §6.4 S-27 are the explicit approved seed source, while [[DOC-014]] owns future authoring guidance. The implementation meets FRD-013’s reconciliation path by retaining setup as the repair mechanism and its verification rail. It preserves ADR-0015’s discovered-reference/content-hash design: `staleness.ts` has no literal conduct body, no version stamp, no new state, and no automatic repair. It also satisfies FRD-023’s managed orientation/skills release expectations.

## Risks / follow-ups

- The setup skill is necessarily a literal offline copy; its existing full-body equality check remains the drift guard, strengthened by named conduct checks.
- [[SKILL-024]] owns skeleton reconciliation and [[SKILL-026]] owns disposable-repo integration verification. This ticket does not modify human-owned prose outside markers.
- After rebasing current `main`, the release artifact was rebuilt and verified in a standalone non-linked checkout that owns its dependencies; the ticket worktree’s deliberate linked-worktree guard remains in force.

## Verification hand-off

On merged `main`, run:

- `npm run verify:agents-block` — expect all lifecycle, exact-mirror, and 24-rule conduct checks to pass.
- `npm test -w @kanmer/core -- staleness.test.ts` — expect the conduct-less former block scenario to report `agents-block: behind`.
- `npm run build && node packages/mcp-server/src/smoke.mjs` — expect the public `get_status.repo` staleness smoke to pass.
- `npm run verify:skills`, then `npm run plugin:build` and `npm run plugin:check` from the canonical main checkout — expect the skill and bundle rails to pass.
- `git diff --check` — expect no whitespace errors.
