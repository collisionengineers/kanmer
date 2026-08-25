# Files — SKILL-034

## Change surface

| Path | Role |
|---|---|
| `scripts/build-plugin.mjs` | Extend the existing plugin build to copy the canonical managed-block writer and its body into `plugins/kanmer/scripts/`. Reuse the source files; do not create a second implementation. |
| `plugins/kanmer/scripts/agents-block.mjs` | Generated/committed plugin artifact copied from the canonical root script. |
| `plugins/kanmer/scripts/agents-block-body.mjs` | Generated/committed canonical block body dependency. |
| `scripts/check-plugin-sync.mjs` | Assert the packaged plugin scripts exist and are byte-identical to their canonical sources after a fresh build. |
| `scripts/check-plugin-sync.test.mjs` or existing script tests | Regression for missing/drifting packaged setup scripts and installed-layout execution. |
| `scripts/verify-agents-block.mjs` | Extend only if needed to execute the copied installed-layout writer twice and prove byte-idempotence/malformed-marker refusal. |
| `plugins/kanmer/skills/kanmer-setup/SKILL.md` | Clarify the relative installed-layout resolution only if the current `../../scripts` wording is ambiguous; keep one prescribed writer. |
| `AGENTS.md` | Document the plugin packaging convention if build/check commands change. |

## Context files

- `docs/functional/frd/FRD-013-setup-as-reconciliation.md`: setup is repeatable reconciliation.
- `scripts/agents-block.mjs` and `scripts/agents-block-body.mjs`: canonical writer/body; never fork them.
- `scripts/build-plugin.mjs`: existing committed-plugin artifact builder.
- `scripts/check-plugin-sync.mjs`: existing source-to-committed-artifact drift gate.
- `.agents/plugins/marketplace.json` and `plugins/kanmer/.codex-plugin/plugin.json`: confirm the installed version root contains the whole plugin directory.

## Out of scope

No managed-block content change, board migration, setup ingestion behavior, provider connection change, release publication, or manual copy into the user's plugin cache. The installed cache is verified from a staged/mirrored plugin layout; the release later delivers it normally.
