# Checklist — MCP-034

- [x] Re-read MCP-022's independent review, merged sources, smoke/protocol rails, and AGENTS managed-block ownership; confirm scope is only the three findings.
- [x] Make Windows-looking drive/UNC identity vectors resolve with `path.win32` while preserving native path resolution and MCP-022 payload/hash rules.
- [x] Extend `smoke.mjs` with host-invariant Windows expectations and a leaving-boundary `GATE_BLOCKED` assertion that retains legacy text.
- [x] Extend `errors.ts` with only the explicit core single-boundary `leaving … requires …` classifier; keep unrelated errors uncoded and the exact three-code union.
- [x] Add user-owned `AGENTS.md` guidance for optional top-level `expected_project` capability sniffing and the `readOnlyHint: false` central-guard dependency; leave managed content unchanged.
- [x] Build the server and regenerate the committed standalone plugin bundle without tool/reference/dependency changes.
- [x] Run scoped verification, record exit codes, tick completed boxes, and write the post-implementation report; stop at independent review without merge/proof.

## Verification

- [x] `npm run typecheck -w @kanmer/mcp-server`
- [x] `npm run build`
- [x] `node packages/mcp-server/src/smoke.mjs` — 184/184 pass.
- [x] `npm run smoke:protocol` — 42/42 pass.
- [x] `npm run smoke:discovery` — 13/13 pass.
- [x] `npm run test:http -w @kanmer/mcp-server` — 61/61 pass in the focused run.
- [x] `npm run verify:agents-block` — 31/31 pass.
- [x] `git diff --check`
- [x] Committed-bundle stdio smoke with `KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs` — 184/184 pass; bundled protocol smoke — 42/42 pass.
- [x] Hand off `npm run plugin:check` for canonical merged-main verification; linked-worktree invocation intentionally refused before certification.

## Progress notes

- 2026-08-21: Source changes are limited to project-identity host selection, leaving-boundary classification, smoke assertion, and user-owned AGENTS guidance. No managed AGENTS block, core gate wording, tool count, dependency, or token semantics changed.
- 2026-08-21: Commit `3e4d6a34201ac0115bc879299e57d5713ee1ef2c` created on `mcp-034-close-mcp022-findings`. Full `npm test` reached 256 core and 318 GUI tests, then its nested HTTP rail had one existing `src/http.test.mjs` `spawnSync … ETIMEDOUT` failure in `project resolution fails before binding and leaves no listener`; the focused `npm run test:http -w @kanmer/mcp-server` before that run passed 61/61, and isolated `node --test src/http.test.mjs` afterward passed 5/5. The aggregate failure remains disclosed rather than erased.
- 2026-08-21: A complete rerun of exact `npm test` exited 0: core 256/256, GUI 318/318, HTTP 61/61, scripts 66/66; the first transient HTTP timeout remains recorded in the report.\n- 2026-08-21: `npm run typecheck` all workspaces passed. `npm run plugin:check` was attempted and correctly refused in the linked worktree because its workspace dependency resolves to the main checkout; canonical merged-main plugin certification remains an independent-review handoff.
