# Checklist — MCP-034

- [ ] Re-read MCP-022's independent review, merged sources, smoke/protocol rails, and AGENTS managed-block ownership; confirm scope is only the three findings.
- [ ] Make Windows-looking drive/UNC identity vectors resolve with `path.win32` while preserving native path resolution and MCP-022 payload/hash rules.
- [ ] Extend `smoke.mjs` with host-invariant Windows expectations and a leaving-boundary `GATE_BLOCKED` assertion that retains legacy text.
- [ ] Extend `errors.ts` with only the explicit core single-boundary `leaving … requires …` classifier; keep unrelated errors uncoded and the exact three-code union.
- [ ] Add user-owned `AGENTS.md` guidance for optional top-level `expected_project` capability sniffing and the `readOnlyHint: false` central-guard dependency; leave managed content unchanged.
- [ ] Build the server and regenerate the committed standalone plugin bundle without tool/reference/dependency changes.
- [ ] Run scoped verification, record exit codes, tick completed boxes, and write the post-implementation report; stop at independent review without merge/proof.

## Verification

- [ ] `npm run typecheck -w @kanmer/mcp-server`
- [ ] `npm run build`
- [ ] `node packages/mcp-server/src/smoke.mjs`
- [ ] `npm run smoke:protocol`
- [ ] `npm run smoke:discovery`
- [ ] `npm run test:http -w @kanmer/mcp-server`
- [ ] `npm run verify:agents-block`
- [ ] `git diff --check`
- [ ] Hand off `npm run plugin:check` for canonical merged-main verification; do not run it as a linked-worktree certification.
