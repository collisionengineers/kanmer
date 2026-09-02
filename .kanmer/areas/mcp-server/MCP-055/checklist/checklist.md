# Checklist — MCP-055

- [x] [pre-review] Step 1 — Change `ok()` (`packages/mcp-server/src/index.ts:216-222`) so `structuredContent` is `{ result: data, ...(lastProject ? { project: lastProject } : {}) }`, and confirm the package builds with no type errors.
- [x] [pre-review] Step 2 — Add deep-equal regression checks (text vs `structuredContent.result`) for `get_item`, `update_item`, and `get_status` in `smoke.mjs`; the same `get_status` check on both transports in `smoke-protocol.mjs`; `assert.deepEqual(status.structuredContent.result, statusPayload)` after line 195 in `http.test.mjs`; and one check that an error result's `structuredContent` has no `result` key. All existing assertions in these files still pass unchanged.
- [x] [pre-review] Step 3 — Update the result-shape sentence at `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md:98`; run `npm run plugin:build` and `npm run plugin:check` to regenerate and validate `plugins/kanmer/mcp/kanmer-mcp.cjs`.
- [x] [pre-review] Step 4 — Run `npm run verify` and both smokes against the built bundle (`KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs`); all green.
- [x] [pre-review] Step 4 — Perform and record a live Claude Code observation: temporarily `claude mcp add` the built bundle from the board worktree, call `get_status`, confirm the full payload renders (not just `{project}`), then remove the temporary registration. — **Adjusted (controller instruction):** an MCP server is bound at session start, so a subagent session cannot observe a bundle rebuilt inside it. Substituted a raw JSON-RPC `get_status` against the rebuilt `plugins/kanmer/mcp/kanmer-mcp.cjs` with cwd = the board worktree: `Object.keys(structuredContent) = ["result","project"]` and `structuredContent.result` deep-equals `JSON.parse(content[0].text)` (3580 bytes). The in-host Claude Code rendering check is deferred to verification/promotion (CORE-137 acceptance).
- [ ] [post-merge] Verify the merged result at the exact merge SHA, including the packaged bundle, when applicable.
- [x] [pre-review] Stop at the approved boundary; do not merge or start another ticket.

`[pre-review]` and `[post-merge]` are plain-text labels for humans and skills. Current gates ignore these labels; use `get_doc_gates` for live gate behaviour.

## Progress notes

Append with `set_ticket_doc(doc: "checklist", append: true)`.
