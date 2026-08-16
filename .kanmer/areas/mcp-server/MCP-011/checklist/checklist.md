# MCP-011 — Checklist

## Setup
- [ ] Worktree `.worktrees/mcp-011`, branch `mcp-011-fix-plugin-manifests` off `origin/main`
- [ ] `npm install` inside the worktree so `@kanmer/core` resolves locally

## Falsification on the baseline (before any edit)
- [ ] Record that codex's plugin-registered server never launches on baseline (tool call, not a listing)
- [ ] Record that `updateAvailable` cannot fire on baseline (real manifest, real `skillsStatus`)

## The change
- [ ] `plugins/kanmer/mcp/claude.mcp.json`: `${KANMER_NODE:-node}` + `ELECTRON_RUN_AS_NODE`, `${CLAUDE_PLUGIN_ROOT}` args kept, no `--root`
- [ ] `plugins/kanmer/.mcp.json`: `node` + relative `args` + `cwd: "."` + `ELECTRON_RUN_AS_NODE`, `${PLUGIN_ROOT}` removed
- [ ] `plugins/kanmer/.claude-plugin/plugin.json` version → `0.3.2`
- [ ] `plugins/kanmer/.codex-plugin/plugin.json` version → `0.3.2`

## Rails against recurrence
- [ ] `check-plugin-sync.mjs`: both `plugin.json` versions equal `package.json`
- [ ] `check-plugin-sync.mjs`: each manifest's invocation resolves to a real file under `plugins/kanmer`
- [ ] `check-plugin-sync.mjs`: `.mcp.json` contains no `${…}` token
- [ ] `check-plugin-sync.mjs`: the new assertions fail when deliberately broken (rail proven, not assumed)
- [ ] `release.mjs` bumps both plugin manifests alongside the two `package.json` files
- [ ] `connect.test.ts`: real `skillsStatus()` over the real manifest — bundled equals `package.json`, older stamp yields `updateAvailable: true`

## Documents
- [ ] FRD-012 **R6**: plugin-runtime matrix with the establishing commands
- [ ] FRD-012 R2 codex bullet corrected; closing open-work line for MCP-011 widened
- [ ] README: the `KANMER_NODE` escape hatch
- [ ] Follow-up ticket filed for agy's unlaunchable plugin MCP server

## Live verification — the mechanism, never a listing
- [ ] claude: marketplace add + install, then **call `get_status`** → this repo's board, no `--root`
- [ ] claude: same again with `KANMER_NODE=<Kanmer.exe>` → still answers, on Electron
- [ ] codex: marketplace add + `plugin add kanmer@kanmer-plugins`, then **call the tool** → answers (baseline: never launched)
- [ ] grok: `plugin install … --trust`, then **call the tool** → answers (no regression)
- [ ] Every probe install reverted; `git status` clean of stray Connect/AGENTS.md writes

## Rail
- [ ] `npm test`
- [ ] `npm run typecheck`
- [ ] `npm run plugin:check` (clean detached checkout if the shared main checkout is contended)
- [ ] `npm run smoke:protocol`
- [ ] Post-implementation report written; PR opened
