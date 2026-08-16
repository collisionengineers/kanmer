# MCP-011 — Checklist

## Setup
- [x] Worktree `.worktrees/mcp-011`, branch `mcp-011-fix-plugin-manifests` off `origin/main`
- [x] `npm install` inside the worktree so `@kanmer/core` resolves locally

## Falsification on the baseline (before any edit)
- [x] codex's plugin-registered server never launches on baseline — `TOOL_ABSENT` from a real tool call
- [x] `updateAvailable` cannot fire on baseline — `expected '0.1.0' to be '0.3.2'`

## The change
- [x] `plugins/kanmer/mcp/claude.mcp.json`: `${KANMER_NODE:-node}` + `ELECTRON_RUN_AS_NODE`, `${CLAUDE_PLUGIN_ROOT}` args kept, no `--root`
- [x] `plugins/kanmer/.mcp.json`: `node` + relative `args` + `cwd: "."` + `ELECTRON_RUN_AS_NODE`, `${PLUGIN_ROOT}` removed
- [x] `plugins/kanmer/.claude-plugin/plugin.json` version → `0.3.2`
- [x] `plugins/kanmer/.codex-plugin/plugin.json` version → `0.3.2`

## Rails against recurrence
- [x] `check-plugin-sync.mjs`: both `plugin.json` versions equal `package.json`
- [x] `check-plugin-sync.mjs`: each manifest's invocation resolves to a real file under `plugins/kanmer`
- [x] `check-plugin-sync.mjs`: `.mcp.json` contains no `${…}` token
- [x] `check-plugin-sync.mjs`: the new assertions fail when deliberately broken (all three proven)
- [x] `release.mjs` bumps both plugin manifests alongside the two `package.json` files
- [x] `connect`-level test: real `skillsStatus()` over the real manifest, in `skillsVersion.test.ts`

## Documents
- [x] FRD-012 **R6**: plugin-runtime matrix with the establishing commands
- [x] FRD-012 **R7**: neither manifest pins a board
- [x] FRD-012 R2 codex bullet corrected; closing open-work line widened
- [x] README: the `KANMER_NODE` escape hatch, and codex's skills-only reality
- [x] Follow-up ticket filed — [[MCP-016]]

## Live verification — the mechanism, never a listing
- [x] claude: marketplace add + install, then **call `get_status`** → `ancestor-worktree`, 151 tickets, no `--root`
- [x] claude: same again with `KANMER_NODE=<Kanmer.exe>` → still answers, on Electron 31.7.7
- [x] codex: marketplace add + `plugin add`, then **call the tool** → still `TOOL_ABSENT`; root cause isolated and recorded, [[MCP-016]] filed
- [x] grok: `plugin install … --trust`, then **call the tool** → answers, no regression
- [x] Every probe install reverted; `git status` clean of stray Connect/AGENTS.md writes

## Rail
- [x] `npm test` — 220/220 (one Windows teardown flake on the first run, noted in the report)
- [x] `npm run typecheck`
- [x] `npm run plugin:check` — `manifests at v0.3.2`; bundle bytes already matched, no rebuild needed
- [x] `npm run smoke:protocol` — 26/26
- [x] Post-implementation report written; PR opened

## Progress notes

**The codex finding changed the shape of this ticket.** The plan assumed the
only open question was Node vs Electron. It turned out `.mcp.json` had never
worked on codex at all, for a reason MCP-009's `codex mcp list` evidence could
not show — the listing prints an entry as `enabled` for a server that never
starts. Chasing it with a real tool call, against a variable-free control, is
what surfaced it.

`cwd: "."` was found by probing rather than reasoning, and it does make codex
launch the server. But it then relocates the server's cwd into the plugin cache,
where MCP-010's discovery correctly finds no board. That trade-off is
unresolvable inside these two files, so it is stated in FRD-012 R6 and owned by
[[MCP-016]] rather than being quietly absorbed or dressed up as a fix.
