# Research — MCP-055

## Question
Why does every 0.4.0 tool result render in Claude Code as only `{"project":{...}}`, and what is the minimal correct fix?

## Findings

1. **`ok()` sets structuredContent to only the project stamp.** `packages/mcp-server/src/index.ts:216-222`:
   ```ts
   function ok(data: unknown): ToolResult {
     return {
       content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
       ...(lastProject ? { structuredContent: { project: lastProject } } : {}),
     };
   }
   ```
   `data` (the real payload) only ever reaches `content[0].text`. Confirmed by direct read; matches the ticket's claim exactly.

2. **`failCoded` already does it right.** `packages/mcp-server/src/errors.ts:74-87`, structured object built at lines 78-81:
   ```ts
   const structured = {
     ...(code ? { error: { code, message } } : {}),
     ...(project ? { project } : {}),
   };
   ```
   Error results carry both `error` and `project` at the top level of `structuredContent`, which is why errors already render fully in Claude Code — this is the shape `ok()` should mirror for successes (`result` in place of `error`).

3. **~50 `ok(` call sites** in `packages/mcp-server/src/index.ts` (`grep -c "ok(" index.ts` = 50) — confirms the architect's estimate; all go through the one `ok()` builder, so the fix is centralized.

4. **No tool declares `outputSchema`.** `grep outputSchema packages/mcp-server/src` returns nothing in `index.ts`/`errors.ts`. Confirmed against the SDK itself: `node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js` `validateToolOutput()`:
   ```js
   async validateToolOutput(tool, result, toolName) {
     if (!tool.outputSchema) { return; }
     ...
   }
   ```
   Validation is skipped entirely when no `outputSchema` is registered, which is our case for every tool — so changing the shape of `structuredContent` cannot trip SDK-side validation, and there is no reason to add `outputSchema` for this fix.

5. **Two return values already put their own richer `project` block inside the payload** — a naive `{ ...payload, project: lastProject }` spread would silently downgrade these:
   - `get_status` (`index.ts:759`): `project: { ...legacy, ...logical, location }` — a multi-field object (legacy fingerprint fields + FRD-029 identity + machine-local `location`), far richer than `lastProject`'s 3 fields.
   - `get_execution_packet` (`index.ts:1173`): `project: { ...packet.project, project_id: logical.project_id, board_id: logical.board_id, identity: logical.identity }`.
   A spread-based fix (`{ ...data, project: lastProject }`) would overwrite both with the poorer stamp and make `content[0].text` (the real payload) disagree with `structuredContent` at exactly the fields `smoke.mjs`/`http.test.mjs` assert on. This rules out the spread approach for both objects and non-objects (arrays/scalars can't be spread into a keyed object at all), and confirms the architect's `{ result: data, ...(lastProject ? { project: lastProject } : {}) }` shape is correct and uniform — one branch, not two.

6. **MCP spec / SDK types treat `structuredContent` as the structured result, not a decoration.** `node_modules/@modelcontextprotocol/sdk/dist/esm/spec.types.d.ts` (`CallToolResult`, ~line 1035-1043):
   ```ts
   export interface CallToolResult extends Result {
     /** A list of content objects that represent the unstructured result of the tool call. */
     content: ContentBlock[];
     /** An optional JSON object that represents the structured result of the tool call. */
     structuredContent?: { ... };
   }
   ```
   and on `Tool.outputSchema` (~line 1194-1196): "defining the structure of the tool's output returned in the structuredContent field". This matches the ticket's paraphrase: `structuredContent`, when present, is meant to represent the whole result, which is exactly why a client that prefers structured content over text (Claude Code) shows only what's there — today, only the project stamp.

7. **Existing assertions that must keep passing** (checked each at its exact line — all still valid under `{ result, project }`):
   - `smoke.mjs:483-485` — `plan.structuredContent?.error === undefined && typeof plan.structuredContent?.project?.fingerprint === "string"` (top-level `project`, untouched).
   - `smoke.mjs:610-613` — `readWithProject.structuredContent?.project?.project_id === projectId && ...fingerprint === expectedProject` (top-level `project`, untouched).
   - `smoke.mjs:621-622` — `acceptedById.structuredContent?.project?.project_id === projectId` on a write result (top-level `project`, untouched).
   - `smoke-protocol.mjs:205-209` — reads `statusPayload` from `JSON.parse(textOf(status.result))` (the text block, not structuredContent) and asserts `statusPayload.project.fingerprint`/`compat.expectedProject`; unaffected by this change since it never reads `result.structuredContent` for `get_status`. Confirms this is the seam where the new deep-equal regression assertion belongs.
   - `http.test.mjs:194-197` — likewise reads `status.content[0].text` today; the new assertion here (see plan) adds a check against `status.structuredContent.result`.
   All of these read `structuredContent.project` at the top level or `structuredContent.error`, never a field that would move under `result`, so the new shape does not break them.

## Implication for the plan
The fix is a single change to `ok()`: wrap the payload under a `result` key and keep `project` a top-level sibling, exactly as `failCoded` already keeps `error` and `project` siblings. No `outputSchema` needed. New tests assert `JSON.parse(content[0].text)` deep-equals `structuredContent.result` (not the whole `structuredContent`, since `project` is a sibling, not part of the payload).
