# Files — MCP-055

## Where the change lands

| Path | Why |
|---|---|
| `packages/mcp-server/src/index.ts` | `ok()` (lines 216-222) is the single builder used by ~50 call sites; change its `structuredContent` shape to `{ result: data, ...(lastProject ? { project: lastProject } : {}) }` so the full payload rides in structured content, not just the project stamp. No other code in this file changes — `get_status` (line 759) and `get_execution_packet` (line 1173) keep building their own richer `project` field inside `data`; that field simply moves under `structuredContent.result.project` instead of being lost to the spread. |
| `packages/mcp-server/src/smoke.mjs` | Add a regression check near the existing project-stamp assertions (:483-485, :610-613) that deep-equals `JSON.parse(content[0].text)` against `structuredContent.result` for a representative read (`get_item`), a representative write (`update_item`), and `get_status`; also add one assertion that an error result's `structuredContent` has no `result` key. |
| `packages/mcp-server/src/smoke-protocol.mjs` | Add the same deep-equal check for `get_status` on both transports, near the existing `statusPayload` read at ~line 203-209. |
| `packages/mcp-server/src/http.test.mjs` | Add `assert.deepEqual(status.structuredContent.result, statusPayload)` after the existing `statusPayload` parse at line 195 (existing assertions at 196-197 stay as-is). |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | Update the result-shape sentence at line 98 ("but every result ... carries structuredContent.project") to also state that `structuredContent.result` mirrors `content[0].text` for a successful call. |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | Generated bundle; regenerate via `npm run plugin:build` after the source change — never hand-edit. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `packages/mcp-server/src/errors.ts` (lines 74-87, structured object at 78-81) | `failCoded` already keeps `error` and `project` as top-level siblings inside `structuredContent` — this is the precedent shape `ok()` should mirror with `result` in place of `error`. Do not change this file; it is already correct. |
| `packages/mcp-server/src/index.ts` lines 195-214 | `lastProject`/`responseProject`/`ToolResult` type context immediately above `ok()`; `ToolResult.structuredContent` stays `Record<string, unknown>` — no type change needed. |
| `node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js` (`validateToolOutput`, ~line 185) | Confirms `structuredContent` is never validated unless the tool declares `outputSchema`; no tool here does, so this change cannot trip SDK validation and no `outputSchema` should be added. |
| AGENTS.md | Grepped for `structuredContent` — no matches, so no AGENTS.md edit is needed. |

## Ripple effects

- Callers: none outside this package call `ok()` directly; MCP clients (Claude Code, any script parsing `structuredContent`) are the only external callers, and this is the fix they need.
- Tests: `smoke.mjs`, `smoke-protocol.mjs`, `http.test.mjs` as above; `release.test.mjs` and `reconciliation.test.mjs` only assert on `structuredContent.error.*`, unaffected.
- Docs: `tool-reference.md` line 98 as above.
- Build artifacts: `plugins/kanmer/mcp/kanmer-mcp.cjs` must be regenerated (`npm run plugin:build`) and checked (`npm run plugin:check`) so the packaged bundle matches source before the Claude Code observation step.

## Out of scope

- No `outputSchema` is added to any tool (confirmed unnecessary above; adding one would newly enable SDK-side validation on ~50 tools' payload shapes, which is a much larger, unrequested change).
- No change to `errors.ts`/`failCoded` — its shape is already correct and is the precedent, not a target.
- No change to `ToolResult`'s TypeScript type — it is already `Record<string, unknown>` and needs no widening.
- No renaming or restructuring of the `data` payloads any handler passes to `ok()` — this ticket only changes how `ok()` wraps whatever it receives, not what any handler computes.
