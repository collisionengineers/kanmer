# Plan — MCP-055: Tool results collapse to the project stamp in clients that render structuredContent

## Objective
Make `structuredContent` carry the complete successful-call payload (not just the project stamp) so MCP clients that prefer structured content over text — Claude Code among them — render the full result again, while every existing project-stamp and error-shape assertion keeps passing unchanged.

## Starting state
`ok()` in `packages/mcp-server/src/index.ts:216-222` returns `structuredContent: { project: lastProject }` only; the real payload lives only in `content[0].text`. `failCoded` (`packages/mcp-server/src/errors.ts:74-87`, built at 78-81) already returns `{ error, project }` as siblings. No tool declares `outputSchema` (confirmed: `grep outputSchema packages/mcp-server/src` — no hits in index.ts/errors.ts; also confirmed the SDK skips `validateToolOutput` entirely when a tool has no `outputSchema`). `get_status` (`index.ts:759`) and `get_execution_packet` (`index.ts:1173`) each already embed their own richer `project` field inside their returned payload.
Evidence: `research/research.md`@`1347a30826d941d7`, `files/files.md`@`69601a82bf7465ec`.

## Governing docs
- FRD-029 (`docs/functional/frd/FRD-029-logical-project-identity-and-endpoints.md`): **Meets.** FRD-029's acceptance criterion is "every response identifies the logical project" — this plan keeps `structuredContent.project` present on every successful and error result (unchanged location/shape), it only stops that stamp from being the *only* thing in `structuredContent`.

## Required changes
Change `ok()` so `structuredContent` is `{ result: data, ...(lastProject ? { project: lastProject } : {}) }` instead of `{ project: lastProject }`. `data` is nested under `result` (not spread) because two payloads (`get_status`, `get_execution_packet`) already contain their own `project` key richer than `lastProject`; a top-level spread would silently overwrite it and make `content[0].text` disagree with `structuredContent` at exactly the fields the smokes assert. Nesting under `result` also uniformly handles arrays and scalars, which cannot be spread into a keyed object. Invariant after this change: a result's `structuredContent` has `result` xor `error`, and `project` always sits at the top level alongside it. No `outputSchema` is declared (not required, and would add a much larger unrequested validation surface across ~50 tools). `ToolResult`'s TypeScript type is unchanged (`structuredContent?: Record<string, unknown>` already permits this shape).

## Expected files
| Action | Repo-root-relative path | Responsibility |
|---|---|---|
| Modify | `packages/mcp-server/src/index.ts` | Change the `ok()` body (lines 216-222) to the new `structuredContent` shape. No other line in this file changes. |
| Modify | `packages/mcp-server/src/smoke.mjs` | Add deep-equal regression checks (`content[0].text` JSON vs `structuredContent.result`) for `get_item`, `update_item`, `get_status`; add one assertion that an error result's `structuredContent` has no `result` key. |
| Modify | `packages/mcp-server/src/smoke-protocol.mjs` | Add the same `get_status` deep-equal check on both transports near the existing `statusPayload` read (~line 203-209). |
| Modify | `packages/mcp-server/src/http.test.mjs` | Add `assert.deepEqual(status.structuredContent.result, statusPayload)` after line 195. |
| Modify | `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | Update the result-shape sentence at line 98 to also describe `structuredContent.result`. |
| Modify (generated) | `plugins/kanmer/mcp/kanmer-mcp.cjs` | Regenerate via `npm run plugin:build`; never hand-edit. |

## Do not modify
- `packages/mcp-server/src/errors.ts` (`failCoded`) — its shape is already correct and is the precedent this plan follows; do not touch it.
- `packages/mcp-server/src/index.ts` lines 759 and 1173 (the `get_status`/`get_execution_packet` payload construction) — their own `project` field is preserved automatically once nested under `result`; do not add special-case branches for them.
- No `outputSchema` addition to any `server.registerTool(...)` call.
- `ToolResult` type definition (`index.ts:210-214`) — unchanged.

## Constraints
- Backwards compatibility: `structuredContent.project` must remain at the exact same top-level shape/location every existing smoke/http test already asserts (`smoke.mjs:483-485,610-613,621-622`; `smoke-protocol.mjs` `statusPayload` reads via text, unaffected; `http.test.mjs:196-197`).
- One shape for all payload kinds: objects, arrays, and scalars must all resolve through the same `{ result: data, ...project }` branch — no per-type special casing.
- Residual accepted risk: this roughly doubles response bytes on the wire (payload now present in both `content[0].text` and `structuredContent.result`); acceptable per MCP spec, since `structuredContent` is documented as the structured form of the same result, not a decoration.

## Ordered steps

### Step 1 — Change `ok()` to wrap the payload under `result`
- Preconditions: none; this is the first and only code change.
- Files: `packages/mcp-server/src/index.ts`
- Symbols: `ok` (function, lines 216-222)
- Change: Replace the return statement's `structuredContent` spread from `...(lastProject ? { structuredContent: { project: lastProject } } : {})` to `...(lastProject ? { structuredContent: { result: data, project: lastProject } } : { structuredContent: { result: data } })` — i.e. `structuredContent` is now always present with `result`, and `project` is added only when `lastProject` is known (mirrors the existing `lastProject ?` guard, just extended to also carry `result` unconditionally). Confirm the exact updated line reads: `structuredContent: { result: data, ...(lastProject ? { project: lastProject } : {}) }`.
- Preserved behaviour: `content[0].text` is unchanged (`JSON.stringify(data, null, 2)`); `structuredContent.project` keeps the exact same value/shape as before when `lastProject` is set; absent when it is not (matching current conditional behaviour, just no longer gating `result` too).
- Forbidden: no spreading `data`'s own keys directly into `structuredContent`'s top level; no `outputSchema` addition; no edits to `failCoded`/`errors.ts`.
- Negative cases: an error path (`fail`/`failCoded`) must still produce `structuredContent.error` and no `result` key — verified by the new smoke assertion in Step 2.
- Tests: `packages/mcp-server/src/smoke.mjs`, `packages/mcp-server/src/smoke-protocol.mjs`, `packages/mcp-server/src/http.test.mjs` (Step 2).
- Commands: `npm run build` (or the package's TS build) to confirm no type errors.
- Expected output: clean TypeScript build.
- Done when: `ok()`'s return statement matches the exact shape above and the package builds.
- Deviation stop: if any existing handler's `data` argument to `ok()` is itself `undefined`/`null` in a way that changes behaviour under `{ result: data }` versus the old shape, stop and report rather than adding a special case.

### Step 2 — Add regression tests proving text and structured content agree
- Preconditions: Step 1 complete.
- Files: `packages/mcp-server/src/smoke.mjs`, `packages/mcp-server/src/smoke-protocol.mjs`, `packages/mcp-server/src/http.test.mjs`
- Symbols: none new; extend existing `check(...)`/`assert.*` call sequences.
- Change: In `smoke.mjs`, near the existing project-stamp checks at :483-485 and :610-613, add: (a) for a representative read (`get_item`) and a representative write (`update_item`), `assert.deepEqual(JSON.parse(textOf(result)), result.structuredContent?.result)`; (b) the same for `get_status`; (c) one check that an error result (e.g. the existing `WRONG_PROJECT` case) has `structuredContent?.result === undefined`. In `smoke-protocol.mjs`, near the existing `statusPayload` read (~line 203-209), add the same deep-equal for `get_status` on both transports (`stdio`/`http` — whichever the loop already iterates as `proto`). In `http.test.mjs`, immediately after line 195 (`const statusPayload = JSON.parse(status.content[0].text);`), add `assert.deepEqual(status.structuredContent.result, statusPayload);`.
- Preserved behaviour: none of the pre-existing assertions at the cited line numbers change.
- Forbidden: do not weaken or remove any existing assertion to make a new one pass.
- Negative cases: the error-result assertion (no `result` key) must fail loudly if `ok()` is ever called on an error path by mistake.
- Tests: this step *is* the tests.
- Commands: `node packages/mcp-server/src/smoke.mjs`, `node packages/mcp-server/src/smoke-protocol.mjs`, `node --test packages/mcp-server/src/http.test.mjs` (or `npm test` scoped to the package — confirm the exact script name in `package.json` before running).
- Expected output: all checks/assertions pass (`smoke.mjs`/`smoke-protocol.mjs` print pass counts with zero failures; `http.test.mjs` exits 0).
- Done when: all three files' commands pass locally.
- Deviation stop: if a pre-existing assertion breaks under the new shape, stop and report — do not adjust the assertion without re-checking the Required changes/Constraints sections above.

### Step 3 — Update docs and regenerate the packaged bundle
- Preconditions: Steps 1-2 complete and green.
- Files: `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md`, `plugins/kanmer/mcp/kanmer-mcp.cjs`
- Symbols: none (prose/generated artifact).
- Change: In `tool-reference.md`, extend the sentence at line 98 ("but every result — reads, writes and errors alike — carries `structuredContent.project`") to also state that a successful call's `structuredContent.result` mirrors `content[0].text`. Then run `npm run plugin:build` to regenerate `kanmer-mcp.cjs` from the updated source, and `npm run plugin:check` to validate the bundle.
- Preserved behaviour: no other sentence in `tool-reference.md` changes.
- Forbidden: hand-editing `kanmer-mcp.cjs` directly.
- Negative cases: `plugin:check` must fail if the bundle and source diverge — confirm it passes after the rebuild.
- Tests: `npm run plugin:check`.
- Commands: `npm run plugin:build`, `npm run plugin:check`.
- Expected output: both commands exit 0; `git diff` shows `kanmer-mcp.cjs` regenerated consistently with the `index.ts` change.
- Done when: bundle rebuilt and checked.
- Deviation stop: if `plugin:build`/`plugin:check` reveal an unrelated drift in the bundle, stop and report rather than folding an unrelated fix into this ticket.

### Step 4 — Full verification and a real Claude Code observation
- Preconditions: Steps 1-3 complete.
- Files: none (verification only).
- Symbols: none.
- Change: none — this step only runs and observes.
- Preserved behaviour: n/a.
- Forbidden: skipping the live Claude Code check and substituting only automated tests — the ticket's Verification section explicitly requires a live observation.
- Negative cases: n/a.
- Tests: `npm run verify`; both smokes with `KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs`.
- Commands: `npm run verify`; `KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs node packages/mcp-server/src/smoke.mjs`; `KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs node packages/mcp-server/src/smoke-protocol.mjs`; then temporarily `claude mcp add` pointing at `plugins/kanmer/mcp/kanmer-mcp.cjs` from the board worktree, call `get_status`, and observe the full payload (not just `{project}`) renders in the Claude Code session; remove the temporary `claude mcp add` registration afterward.
- Expected output: `npm run verify` green; both smokes green under the built bundle; the live `get_status` call in Claude Code shows the full status payload, not just the project stamp.
- Done when: all commands pass and the live observation is recorded (exact merged SHA + description of what was seen) for the post-implementation report / proof.
- Deviation stop: if the live observation still shows only `{project}` after the rebuild, stop and report — do not mark this ticket done on automated tests alone.

## Acceptance checks
- `content[0].text` and `structuredContent.result` are byte-for-byte the same JSON for every successful call exercised by the smokes (get_item, update_item, get_status).
- No existing `structuredContent.project` or `structuredContent.error` assertion changes value or location.
- An error result's `structuredContent` has no `result` key.
- `npm run plugin:check` passes after `npm run plugin:build`.
- A live Claude Code session against the built bundle shows the full `get_status` payload.

## Commands
- Focused: `node packages/mcp-server/src/smoke.mjs`, `node packages/mcp-server/src/smoke-protocol.mjs`, `node --test packages/mcp-server/src/http.test.mjs` (confirm exact test-runner invocation in `package.json` if different).
- Full repository rail: `npm run verify`.
- Build/packaging: `npm run plugin:build`, `npm run plugin:check`.
- Post-merge/environment: repeat both smokes with `KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs`; live Claude Code `get_status` observation against the built bundle from the board worktree.

## Failure and deviation rules
Stop and report rather than improvise on: any pre-existing assertion breaking under the new shape; any handler whose `data` argument behaves unexpectedly under `{ result: data }`; any drift `plugin:check` finds between bundle and source; a live Claude Code observation that still shows only `{project}`; any temptation to add `outputSchema`, spread `data`'s keys into `structuredContent`'s top level, or touch `errors.ts`. None of these are silently redesigned — they are reported back before proceeding.

## Stop condition
Stop once Step 4's commands are all green and the live Claude Code observation is recorded. Do not merge and do not start another ticket — that is `kanmer-review`'s and the controller's job, not this execution phase's.
