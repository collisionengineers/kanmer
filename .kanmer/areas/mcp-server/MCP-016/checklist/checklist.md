# Checklist — MCP-016

## Setup
- [ ] Worktree `.worktrees/mcp-016` on branch `mcp-016-plugin-mcp-scope` off `origin/main`
- [ ] Baseline evidence captured on the pre-change tree (codex: `NO_KANMER_MCP_TOOL` beside `mcp list` `enabled`; `agy`: `mcpServers : 1 processed` + `Cannot find module`)
- [ ] `~/.gemini/config` and `~/.gemini/skills` snapshotted before any `agy` install

## The change
- [ ] Delete `plugins/kanmer/.mcp.json`
- [ ] Remove `"mcpServers": "./.mcp.json"` from `plugins/kanmer/.codex-plugin/plugin.json`, everything else untouched
- [ ] `plugin:check`: codex manifest must have **no** `mcpServers` key
- [ ] `plugin:check`: `plugins/kanmer/.mcp.json` must **not exist**, reason inline
- [ ] `plugin:check`: `mcp/claude.mcp.json` rules unchanged; `.mcp.json` dropped from the no-`--root` loop
- [ ] `plugin:check`: the "two configs must not be unified" comment block re-reasoned for one config
- [ ] Each new assertion demonstrated **failing** on a restored file/key, then restored

## Documents
- [ ] FRD-012 **R6** amended: matrix rows for codex and `agy`, plus the three-part reasoning (no expansion; unrescuable; redundant given Connect)
- [ ] FRD-012 **R2** codex bullet corrected
- [ ] FRD-012 "Open work" line closes MCP-016
- [ ] README codex paragraph reworded; one Antigravity sentence added
- [ ] `docs/manual/` deliberately unchanged, with the reason recorded

## Rail (from the MAIN checkout)
- [ ] `npm test`
- [ ] `npm run typecheck`
- [ ] `npm run plugin:check`
- [ ] `npm run check:manual`
- [ ] `npm run verify:agents-block`
- [ ] `git diff AGENTS.md` is empty before committing

## Host verification — by calling a tool, never a listing
- [ ] codex, fresh `CODEX_HOME`, real plugin install: `codex exec` calling `get_status` → no kanmer tool
- [ ] codex, same install: `codex mcp list` now lists **no** kanmer server (the listing agreeing with the mechanism)
- [ ] codex, same install: the 12 `kanmer-*` skills still reach the agent (positive control)
- [ ] `agy plugin install ./plugins/kanmer` → `mcpServers : skipped (not found)`, `skills : 12 processed`
- [ ] `agy` session bound to a **Connect-free** folder: no `kanmer` MCP server
- [ ] **Connect still answers**: `codex exec` in the repo, default `CODEX_HOME`, calls `get_status` → real board JSON
- [ ] `~/.gemini` restored after uninstall and the restore verified by diff against the snapshot

## Close
- [ ] `git fetch origin && git rebase origin/main`; both manifests re-read post-rebase
- [ ] Follow-up ticket filed for the stale `AGENTS.md:149` repo-map line
- [ ] PR opened; review written (author and reviewer both me, said in the first line); merged
- [ ] `proof` written on merged main; MCP-016 → done; closeout from the main checkout
