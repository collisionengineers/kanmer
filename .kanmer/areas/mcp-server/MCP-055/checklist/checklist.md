# Checklist — MCP-055

- [x] [pre-review] Step 1 — Change `ok()` (`packages/mcp-server/src/index.ts:216-222`) so `structuredContent` is `{ result: data, ...(lastProject ? { project: lastProject } : {}) }`, and confirm the package builds with no type errors.
- [x] [pre-review] Step 2 — Add deep-equal regression checks (text vs `structuredContent.result`) for `get_item`, `update_item`, and `get_status` in `smoke.mjs`; the same `get_status` check on both transports in `smoke-protocol.mjs`; `assert.deepEqual(status.structuredContent.result, statusPayload)` after line 195 in `http.test.mjs`; and one check that an error result's `structuredContent` has no `result` key. All existing assertions in these files still pass unchanged.
- [x] [pre-review] Step 3 — Update the result-shape sentence at `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md:98`; run `npm run plugin:build` and `npm run plugin:check` to regenerate and validate `plugins/kanmer/mcp/kanmer-mcp.cjs`.
- [x] [pre-review] Step 4 — Run `npm run verify` and both smokes against the built bundle (`KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs`); all green.
- [x] [pre-review] Step 4 — Perform and record a live Claude Code observation: temporarily `claude mcp add` the built bundle from the board worktree, call `get_status`, confirm the full payload renders (not just `{project}`), then remove the temporary registration. — **Adjusted (controller instruction):** an MCP server is bound at session start, so a subagent session cannot observe a bundle rebuilt inside it. Substituted a raw JSON-RPC `get_status` against the rebuilt `plugins/kanmer/mcp/kanmer-mcp.cjs` with cwd = the board worktree: `Object.keys(structuredContent) = ["result","project"]` and `structuredContent.result` deep-equals `JSON.parse(content[0].text)` (3580 bytes). The in-host Claude Code rendering check is deferred to verification/promotion (CORE-137 acceptance).
- [x] [post-merge] Verify the merged result at the exact merge SHA, including the packaged bundle, when applicable. — Verified at merge SHA `ef0013448c93227aad16549d77a284743cdf01d5` (PR #310, squash-merged 2026-09-02T01:51:08Z) in the detached worktree `.worktrees/verify-mcp-055-ef001344`: `npm run plugin:check` exit 0 (bundle bytes match a fresh build), `node --test packages/mcp-server/src/http.test.mjs` 5/5, `smoke.mjs` 383/383 and `smoke-protocol.mjs` 54/54 against the packaged bundle, a raw JSON-RPC `get_status` against the board worktree returning `structuredContent` keys `[result, project]` with a 3594-byte payload deep-equal to `content[0].text`, and the full `npm run verify` rail exit 0. Proof result PASS — see `proof/proof.md`.
- [x] [pre-review] Stop at the approved boundary; do not merge or start another ticket.

`[pre-review]` and `[post-merge]` are plain-text labels for humans and skills. Current gates ignore these labels; use `get_doc_gates` for live gate behaviour.

## Progress notes

Append with `set_ticket_doc(doc: "checklist", append: true)`.

## Closeout — MCP-055

- [x] PR merge verified (`gh pr view 310 --json state,mergeCommit,mergedAt,baseRefName` → MERGED, ef001344, base main)
- [x] proof.md finalised (merged SHA, PR URL and merge date recorded; result PASS)
- [x] Moved to final stage (Verifying → Done 2026-09-02T02:57:45Z)
- [x] Traceability recorded (`commits` now carries the merge SHA ef001344; `prs` carries PR #310)
- [x] cd out of worktree; `git worktree remove .worktrees/mcp-055`
- [x] `git branch -D MCP-055-structured-content-result` (squash-merged, so -d refuses)
- [x] `git push origin --delete MCP-055-structured-content-result`
- [x] `git fetch --prune` + `git worktree prune`
- [x] `take_ticket action: "release"` — released 2026-09-02T03:01:05Z; ticket shows Done with no taken/branch/worktree/lease metadata

Not claimed by this closeout: the in-host Claude Code rendering observation
(review finding F-004) is deferred to CORE-137 promotion acceptance.
