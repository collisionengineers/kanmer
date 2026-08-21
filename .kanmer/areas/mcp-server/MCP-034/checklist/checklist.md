# Checklist — MCP-034

- [x] Re-read MCP-022's independent review, merged sources, smoke/protocol rails, and AGENTS managed-block ownership; confirm scope is only the three findings.
- [x] Make Windows-looking drive/UNC identity vectors resolve with `path.win32` while preserving native path resolution and MCP-022 payload/hash rules.
- [x] Extend `smoke.mjs` with host-invariant Windows expectations and a leaving-boundary `GATE_BLOCKED` assertion that retains legacy text.
- [x] Extend `errors.ts` with only the explicit core single-boundary `leaving … requires …` classifier; keep unrelated errors uncoded and the exact three-code union.
- [x] Add user-owned `AGENTS.md` guidance for optional top-level `expected_project` capability sniffing and the `readOnlyHint: false` central-guard dependency; leave managed content unchanged.
- [x] Build the server and regenerate the committed standalone plugin bundle without tool/reference/dependency changes.
- [ ] Run scoped verification, record exit codes, tick completed boxes, and write the post-implementation report; stop at independent review without merge/proof.

## Verification

- [x] `npm run typecheck -w @kanmer/mcp-server`
- [x] `npm run build`
- [x] `node packages/mcp-server/src/smoke.mjs`
- [x] `npm run smoke:protocol`
- [x] `npm run smoke:discovery`
- [x] `npm run test:http -w @kanmer/mcp-server`
- [x] `npm run verify:agents-block`
- [x] `git diff --check`
- [ ] Hand off `npm run plugin:check` for canonical merged-main verification; do not run it as a linked-worktree certification.

## Progress notes

- 2026-08-21: Source changes are limited to project-identity host selection, leaving-boundary classification, smoke assertion, and user-owned AGENTS guidance. No managed AGENTS block, core gate wording, tool count, dependency, or token semantics changed.
