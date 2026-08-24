# Files — CORE-096

| Path | Responsibility |
| --- | --- |
| apps/gui/release-notes.md | Update the top release section to 0.3.4 and summarize only verified user-facing changes after v0.3.3. This is a manual release input guarded by scripts/release.mjs. |
| package.json; apps/gui/package.json; plugins/kanmer/.claude-plugin/plugin.json; plugins/kanmer/.codex-plugin/plugin.json; plugins/kanmer/plugin.json; mcpb/manifest.json; package-lock.json; plugins/kanmer/mcp/kanmer-mcp.cjs; mcpb/ | Generated and version-bumped only by scripts/release.mjs. Do not edit them manually. |

## Do not modify

- scripts/release.mjs, .github/workflows/release.yml, updater configuration, published existing release assets, or unrelated ticket files.
- The root checkout or board worktree.
