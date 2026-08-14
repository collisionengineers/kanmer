# Phase 6 — Agents: connect providers + install plugin/skills

**Goal:** grow "Connect" from 2 providers (codex, claude) to 5 (+ opencode, grok, antigravity), and make Connect **install the plugin + skills**, not just register the MCP server. Web research changed the shape: two of the new hosts have **no `mcp add` CLI** (config-file only), so the per-target if/ternary ladder becomes a **provider registry**.

**Depends on:** Phase 5 (active-tab root) — soft; can build single-project. **Feeds:** Phase 7 (dispatch shares the registry). **Scope:** `@kanmer/gui` main + shared + packaging.

## Per-provider research (sources cited)

| Provider | MCP register | Headless run | Plugin/skills |
|---|---|---|---|
| codex *(existing)* | CLI `codex mcp add … --env` (global `~/.codex`; per-project name) | `codex exec` | `codex plugin marketplace add` |
| claude *(existing)* | CLI `claude mcp add -s project -e …` (writes `<root>/.mcp.json`) | `claude -p` | `claude plugin marketplace add` + `plugin install` |
| **opencode** | **config file only** — `mcp` object in `opencode.json` (`type:"local"`, `command:[…]`, `environment`) [1] | `opencode run` (non-interactive, no stdin) [2] | reads **AGENTS.md** + `~/.claude/skills/` [3] |
| **grok** | CLI `grok mcp add`; or `~/.grok/config.toml`; also reads project `.mcp.json` [4] | `grok -p --cwd --output-format json` (needs `XAI_API_KEY`) [6] | `.grok/skills/`, Claude compat layer [5] |
| **antigravity** | **config file only** — `mcpServers` in `<root>/.agents/mcp_config.json` (project) or `~/.gemini/config/mcp_config.json` [7][8] | `agy -p` **known-broken piped** (GH #318/#76 [9]) | `SKILL.md` under `~/.gemini/skills/` [8] |

Sources: [1] opencode.ai/docs/mcp-servers · [2] opencode.ai/docs/cli · [3] opencode.ai/docs/rules · [4] docs.x.ai/build/features/mcp-servers · [5] grok skills/plugins guide · [6] docs.x.ai/build/cli/headless-scripting · [7] antigravity.google/docs/mcp · [8] antigravity skills config write-up · [9] antigravity.google/docs/cli/headless + GH antigravity-cli #318/#76.

Three takeaways: (a) config-file writers are unavoidable; (b) **AGENTS.md is a universal skills fallback** across all hosts — so "install skills" for a plugin-less host reduces to ensuring the managed AGENTS.md block (+ best-effort skill-folder copy); (c) antigravity dispatch is broken in our exact pattern → **register-only in v1**.

## Items

### 6.1 Provider registry — L (requests #7, #12)
- **Where:** new `main/providers.ts`; `connect.ts:9,70-117`; `shared/ipc.ts:55`.
- One `AgentProvider` per host declaring three independent capabilities: **register** (`kind:"cli"` add/remove commands **or** `kind:"configFile"` path+format+merge/unmerge), **installPlugin** (`marketplace` | `copySkills` | `agentsOnly`), and optional **dispatch** (Phase 7). `serverInvocation(root)` + `q()` (`connect.ts:28-53`) stay shared. `connectAgent(id, root)` becomes a thin dispatcher on `register.kind`. Config-file writers **parse → merge (preserve unknown keys) → atomic temp+rename** (never full-overwrite) — opencode `opencode.json`, antigravity project `.agents/mcp_config.json`, grok prefers project `.mcp.json` (JSON, dependency-free) over `~/.grok/config.toml` (avoids a TOML parser dep — see risk). Widen `ConnectTarget → ProviderId` (5) in `connect.ts:9` + `ipc.ts:55`. Every register/merge is a **pure function** → unit-testable without spawning.

### 6.2 Install plugin + skills — M (request #12)
- **claude/codex (`marketplace`):** `<cli> plugin marketplace add <localDir>` (+ `claude plugin install kanmer@kanmer`); GitHub slug as documented fallback.
- **opencode/grok/antigravity (`copySkills` + AGENTS.md):** copy `plugins/kanmer/skills/**` into the host skills dir **and** ensure the idempotent, marker-delimited **Kanmer AGENTS.md block** at the top of `<root>/AGENTS.md`. **Prefer project-scoped skill dirs** and empirically confirm each host's support at implementation time — `~/.claude/skills` (opencode's documented fallback) is *Claude's global* dir, so writing there duplicates every skill for claude users across **all** their projects; if a host only supports a global dir, Connect must say so before writing ("installs skills globally for <host>"). Stamp copied skill sets with a version marker (e.g. `.kanmer-skills-version` from the plugin manifest) and have Connect offer **Update skills** when the bundled version is newer; **Disconnect** removes the copied skills and the AGENTS.md block (the unmerge counterpart to every install action). Extract the block writer into a shared helper (export from `@kanmer/core` or a small `agentsBlock.ts`) so Connect and `kanmer-setup` share one source (**handoff to Phase 8** to confirm the marker format) — as real code it finally makes the block round-trip **unit-testable** (closes audit B6, which found it enforced by skill prose only).
- **Packaging:** ship `plugins/kanmer/` (+ the two marketplace JSONs) in `electron-builder.yml` `extraResources` (today only `mcp/kanmer-mcp.cjs` ships) so the packaged app has a real local marketplace source; resolve `repoRoot/plugins/kanmer` in dev via the `app.isPackaged` branch.

### 6.3 GUI wiring — S
- **Handoff to Phase 4's Connect tab:** buttons render from a main-supplied `listProviders()` (no hardcoded codex/claude), so adding a 6th host is a data change. `ConnectSection` (`Settings.tsx:217-268`) already has the busy/result/copy-fallback UI to reuse.

## Risks
- **Config-file clobbering** — mitigated by parse-merge-preserve + atomic write.
- **Writing into the user's repo** — opencode/antigravity/grok(`.mcp.json`) land config *inside the project* (may get committed); same footprint as claude's existing `.mcp.json`, but document it.
- **grok env-passing** unconfirmed for `mcp add`; `ELECTRON_RUN_AS_NODE=1` is mandatory (AGENTS.md gotcha #4) → prefer the project `.mcp.json` JSON path (carries `env`, no TOML dep). Empirical check at implementation time.
- **Stale bundled plugin** — same trap as AGENTS.md gotcha #8: `extraResources` must ship a freshly `plugin:build`-ed bundle or Connect installs a stale server.

## Release rail
No new MCP tools, but Connect now installs the plugin+skills → keep `npm run plugin:build` in the release flow, and ensure `plugins/kanmer/` is packaged. `AGENTS.md` §5/§9 gains the new providers + the "Add an IPC call" recipe.

## Verification
- Unit-test each provider's add-command / config-merge as pure functions (exact command strings + merged JSON incl. `ELECTRON_RUN_AS_NODE`, per-project name, preserved unknown keys, idempotent re-register).
- Unit-test the shared AGENTS.md block writer: add → idempotent re-add (byte-identical) → remove restores the original file (audit B6).
- `npm run typecheck -w @kanmer/gui` for the widened `ProviderId`.
- Manual end-to-end against a sandbox: one CLI host (claude) and one config-file host (opencode) — MCP registered, plugin/skills installed (version marker present), AGENTS.md block present; Disconnect removes config, skills, and block.
