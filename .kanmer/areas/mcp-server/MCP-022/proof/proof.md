# Proof — MCP-022

## Merged target

- PR: #102 — merged 2026-08-21.
- Merged-main commit: `f148769993472ede046cc6201645a5080481eebd`.
- Source commit: `7283abf6705089cf536494db99fcbb18876a2ece`.

## Passing merged-main evidence

- `npm run build` — pass.
- `node packages/mcp-server/src/smoke.mjs` — 184/184 pass.
- `npm run smoke:protocol` — 42/42 pass.
- `npm run smoke:discovery` — 13/13 pass.
- `npm run test:http -w @kanmer/mcp-server` — 3/3 pass.
- `npm run typecheck` — pass (all workspaces).
- `git diff --check` — pass.

## Failed final artifact gate — not a pass

Normal-checkout `npm run plugin:check` exits 1:

```text
Committed plugin bundle differs from a fresh build — run npm run plugin:build.
```

Cause captured from a normal root rebuild: 514 changed comment-path lines in `plugins/kanmer/mcp/kanmer-mcp.cjs`; the committed artifact built in `.worktrees/mcp-022` carries `../../../../node_modules/…`, while a normal checkout build carries `../../node_modules/…`. This is a reproducibility regression, not a harmless proof omission.

[[MCP-033]] is filed and linked as a blocking bug to make the artifact reproducible across ticket worktrees. Therefore MCP-022 remains **Verifying** and must not move to Done until MCP-033 is merged and normal-main `plugin:check` passes cleanly.
