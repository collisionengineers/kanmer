# Checklist — MCP-016

## Setup
- [x] Worktree `.worktrees/mcp-016` on branch `mcp-016-plugin-mcp-scope` off `origin/main`
- [x] Baseline evidence captured on the pre-change tree (codex: `NO_KANMER_MCP_TOOL` beside `mcp list` `enabled`; `agy`: `mcpServers : 1 processed` + `Cannot find module`)
- [x] `~/.gemini/config` and `~/.gemini/skills` snapshotted before any `agy` install

## The change
- [x] Delete `plugins/kanmer/.mcp.json`
- [x] Remove `"mcpServers": "./.mcp.json"` from `plugins/kanmer/.codex-plugin/plugin.json`, everything else untouched
- [x] `plugin:check`: codex manifest must have **no** `mcpServers` key
- [x] `plugin:check`: `plugins/kanmer/.mcp.json` must **not exist**, reason inline
- [x] `plugin:check`: `mcp/claude.mcp.json` rules unchanged; `.mcp.json` dropped from the no-`--root` loop
- [x] `plugin:check`: the "two configs must not be unified" comment block re-reasoned for one config
- [x] Each new assertion demonstrated **failing** on a restored file/key, then restored

## Documents
- [x] FRD-012 **R6** amended: matrix rows for codex and `agy`, plus the three-part reasoning (no expansion; unrescuable; redundant given Connect)
- [x] FRD-012 **R2** codex bullet corrected
- [x] FRD-012 "Open work" line closes MCP-016
- [x] README codex paragraph reworded; one Antigravity sentence added
- [x] `docs/manual/` deliberately unchanged, with the reason recorded

## Rail (from a clean detached clone — `plugin:check` refuses in a worktree, MCP-007)
- [x] `npm test` — exit 0
- [x] `npm run typecheck`
- [x] `npm run plugin:check` — `plugin-sync OK — 30 tools match, bundle bytes match, 12 skill frontmatters parse, manifests at v0.3.2`
- [x] `npm run check:manual` — `manual: up to date (19 chapters)`
- [x] `npm run verify:agents-block` — `28/28 checks passed`
- [x] `git diff AGENTS.md` is empty before committing

## Host verification — by calling a tool, never a listing
- [x] codex, fresh `CODEX_HOME`, real plugin install: `codex exec` calling `get_status` → `NO_KANMER_MCP_TOOL`
- [x] codex, same install: `codex mcp list` → `No MCP servers configured yet.`
- [x] codex, same install: 12 `kanmer-*` skills still reach the agent (positive control)
- [x] `agy plugin install ./plugins/kanmer` → `- mcpServers : skipped (not found)`, `✔ skills : 12 processed`
- [x] `agy` session bound to a **Connect-free** folder: `NO_KANMER_MCP_SERVER`, control server `zzqxprobesrv` still connected
- [x] **Connect still answers**: `codex exec` in the repo, default `CODEX_HOME`, `get_status` → real board JSON (161 tickets)
- [x] `~/.gemini` restored after uninstall; `diff -r` against both snapshots empty; `agy plugin list` → `No imported plugins.`

## Close
- [x] `git fetch origin && git rebase origin/main` — up to date at `b653a33` on `6dbb284`; both manifests re-read post-rebase
- [x] Follow-up ticket filed for the stale `AGENTS.md:149` repo-map line — **DOC-009**
- [x] PR opened — <https://github.com/collisionengineers/kanmer/pull/62>
- [ ] Review written (author and reviewer both me, said in the first line); merged
- [ ] `proof` written on merged main; MCP-016 → done; closeout from the main checkout

---

## Progress notes

**Profile changed `spike` → `fix` during Preparing.** Reasoning in `plan.md`
§Profile; in short, `spike` reaches Done on `research` alone and this ticket
ships real code, so it would have landed with no `proof` — the one artefact the
ticket's own verification rule demands. `fix` is stricter on both boundaries.

**A `_comment` array was added to `.codex-plugin/plugin.json`**, beyond the plan.
The rail's failure message points a future contributor at that file, so the
reasoning should be *in* it. Verified harmless empirically: `codex plugin add`
accepted the manifest with it and delivered all 12 skills.

**Two extra rail assertions, beyond the plan.** With the codex side now asserted
*absent*, nothing was left asserting the plugin still delivers what it does
deliver — so `plugin:check` now also requires both manifests to keep
`"skills": "./skills/"` and requires `mcp/claude.mcp.json` to exist. Both
demonstrated failing.

**The `agy` name collision (research Finding 4)** cost the first probe: run
inside this repo it returned a healthy board from *Connect's* identically-named
`kanmer` server, making the broken plugin entry look fine. Every `agy` probe was
re-run from a Connect-free folder, and FRD-012 R6.3 now records the trap.
