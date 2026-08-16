# Where the change lands

| Path | Why |
|---|---|
| `packages/mcp-server/src/index.ts` | Five group tools; `create_item`/`update_item` gain profile/requires/groups and lose priority; `list_board` and `get_doc_gates` return the resolved v3 vocabulary; column kind narrows to area; descriptions rewritten. |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | Five rows in; stage/priority column prose out; field semantics updated. |
| `packages/mcp-server/src/smoke.mjs` | Group coverage and the profile matrix. |
| `packages/mcp-server/src/smoke-protocol.mjs` | The tool count. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `scripts/check-plugin-sync.mjs:39-45` | The guard: tool **names** only, and it stops reading at `## Field semantics`. Descriptions and params drift unchecked, so they are re-read by hand. |
| `AGENTS.md` §7 (plugin/skill sync) | The rail: reference, then `plugin:build`, then `plugin:check`. |
