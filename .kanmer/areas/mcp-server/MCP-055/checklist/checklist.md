# Checklist — MCP-055

- [ ] [pre-review] Step 1 — Change `ok()` (`packages/mcp-server/src/index.ts:216-222`) so `structuredContent` is `{ result: data, ...(lastProject ? { project: lastProject } : {}) }`, and confirm the package builds with no type errors.
- [ ] [pre-review] Step 2 — Add deep-equal regression checks (text vs `structuredContent.result`) for `get_item`, `update_item`, and `get_status` in `smoke.mjs`; the same `get_status` check on both transports in `smoke-protocol.mjs`; `assert.deepEqual(status.structuredContent.result, statusPayload)` after line 195 in `http.test.mjs`; and one check that an error result's `structuredContent` has no `result` key. All existing assertions in these files still pass unchanged.
- [ ] [pre-review] Step 3 — Update the result-shape sentence at `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md:98`; run `npm run plugin:build` and `npm run plugin:check` to regenerate and validate `plugins/kanmer/mcp/kanmer-mcp.cjs`.
- [ ] [pre-review] Step 4 — Run `npm run verify` and both smokes against the built bundle (`KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs`); all green.
- [ ] [pre-review] Step 4 — Perform and record a live Claude Code observation: temporarily `claude mcp add` the built bundle from the board worktree, call `get_status`, confirm the full payload renders (not just `{project}`), then remove the temporary registration.
- [ ] [post-merge] Verify the merged result at the exact merge SHA, including the packaged bundle, when applicable.
- [ ] [pre-review] Stop at the approved boundary; do not merge or start another ticket.

`[pre-review]` and `[post-merge]` are plain-text labels for humans and skills. Current gates ignore these labels; use `get_doc_gates` for live gate behaviour.

## Progress notes

Append with `set_ticket_doc(doc: "checklist", append: true)`.
