# Files — MCP-018

## Modify

| Path | Exact responsibility |
|---|---|
| `scripts/check-plugin.mjs` | Extend the canonical `plugin:check` implementation so it verifies committed-vs-fresh bytes **and** copies the installable payload to an isolated temp location, resolves the entry point from packaging metadata, sanitizes environment/cwd, performs an MCP startup/tool-discovery handshake, enforces timeout/cleanup, and fails on repository-only resolution. If the existing canonical filename differs, modify that file instead of adding a parallel checker. |
| `package.json` | Keep `plugin:check` pointing to the one canonical checker and ensure root `verify` reaches it once. Change only if current routing bypasses isolated validation. |
| `scripts/verify.mjs` | Inspect CORE-031's shared rail; ensure `plugin:check` remains one step. Do not duplicate plugin build/check. |
| `scripts/build-plugin.mjs` | Inspect artifact manifest/payload selection. Modify only if the check cannot consume the same canonical payload list without duplicating it; export/share a pure payload-description helper where appropriate. |
| `plugins/kanmer/.claude-plugin/plugin.json` | Inspect the canonical plugin metadata/entry path. Modify only if it is demonstrably wrong; the checker must read it rather than hard-code a worktree source path. Use the actual manifest present in the repo if this filename differs. |

## Add only if needed

| Path | Purpose |
|---|---|
| `scripts/check-plugin.test.mjs` | Tests for isolated success, path-with-spaces, sanitized cwd/environment, missing entry, external-only dependency failure, timeout/termination, and cleanup. Place under the existing scripts test convention if that convention uses another path. |
| `scripts/lib/plugin-payload.mjs` | Shared pure helper describing installable plugin files/manifest entry, only if build and check currently duplicate this logic. |
| `scripts/fixtures/plugin-external-require/` | Minimal test-only fixture that succeeds from its source checkout but fails when isolated because of an intentionally external dependency. Keep it outside the real plugin payload. |

## Inspect / consider

| Path | Reason |
|---|---|
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | Actual shipped MCP entry/bundle. It is generated; do not hand-edit. |
| `plugins/kanmer/skills/` | Installable payload files; ensure copy selection matches packaging without pulling repository-only sources. |
| `plugins/kanmer/README.md` and provider metadata | Confirm runtime command/relative path contract. |
| `packages/mcp-server/src/smoke-protocol.mjs` | Reuse the canonical MCP initialization/list-tools client behavior rather than inventing a weaker “process stayed alive” check. |
| `packages/mcp-server/src/smoke-discovery.mjs` or root discovery smoke | Reuse provider/plugin discovery expectations where possible. |
| `packages/mcp-server/package.json` | Runtime dependency ownership; bundled server must not borrow workspace-only dependencies. |
| `package-lock.json` | Inspect only; change only if a real runtime dependency must be owned/bundled. |
| `.github/workflows/pr.yml` | Verify `npm run verify` executes isolated check on Windows. No separate plugin job is needed. |
| `AGENTS.md` release/plugin sections | Preserve the main-checkout build rule and one verification pyramid. |

## Isolation assertions

The test/check must assert:

- copied plugin root is outside repository root;
- child cwd is outside both repository and plugin roots;
- entry path comes from canonical manifest/payload metadata;
- `NODE_PATH`, development loaders, and repository-specific environment are absent;
- path containing spaces works;
- MCP initialize and `tools/list` complete within a bounded timeout;
- process exits/terminates cleanly;
- temp payload is removed;
- a fixture that relies on repository-only module resolution fails;
- committed bundle remains byte-identical to a fresh canonical build.

## Do not modify

- Generated `plugins/kanmer/mcp/kanmer-mcp.cjs` by hand.
- MCP tool count/protocol semantics.
- Plugin/provider registration architecture.
- The check to run from the source/worktree entry point as its proof.
- Global `NODE_PATH` or install packages globally.
- Root verify to run `plugin:build` before `plugin:check` in a way that hides committed-byte drift.
- The real installed plugin/app directories during tests.
