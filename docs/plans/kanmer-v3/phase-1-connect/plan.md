# Phase 1 — Connect rework (FRD-012)

**Goal:** one codex entry per project (project-scoped `.codex/config.toml`, legacy global entries drained) and real project-scoped skill installs for opencode + Antigravity via one `.agents/skills/` write. Independent of the format work — ship early.

**Depends on:** nothing (Phase 0 in parallel). **Feeds:** Phase 6 (skills land where every host reads them).

## Items

### 1.1 codex → configFile provider — M
- **Where:** `apps/gui/src/main/providers.ts` (the codex entry + `cliAddCommand`), `providers.test.ts`.
- Register kind `configFile`: path `<root>/.codex/config.toml`; pure TOML `merge`/`unmerge` for `[mcp_servers.kanmer]` preserving unknown tables/keys (small dep: `smol-toml`). `removeCommands` retains `codex mcp remove kanmer-<project>` as the **legacy cleanup**, run best-effort on connect and disconnect. Connect UI surfaces the trust caveat ("codex loads project config only for trusted folders").

### 1.2 opencode + Antigravity → project skills — M
- Install kind `copySkills` scope project, dir `.agents/skills/` (one tree serves both hosts); stamp `.kanmer-skills-version`; the existing update-offer flow covers refresh. opencode's `opencode.json` MCP registration unchanged; Antigravity registration unchanged. AGENTS block still written for all (orientation layer).

### 1.3 Provider re-verification checkpoint — S
- Before coding 1.1/1.2: re-check each host's current docs (registration paths, skill dirs, trust rules) and record findings in the plan footer — ADR-0009's standing rule, born from this roadmap's own stale-fact incident.

## Release rail
No tool changes. README "Connect an agent manually" section updated (the codex project-file example already exists — align GUI behaviour with it). `verify-agents-block` still green.

## Verification
- providers.test.ts: TOML merge idempotent + unknown-key-preserving + byte-stable re-merge; unmerge removes only kanmer; codex entry asserts configPath + legacy removeCommands; opencode/antigravity install specs assert `.agents/skills` + stamping.
- Manual: connect codex twice on a real project → one project entry, global drained; opencode and AGY skill listings both show the roster from the single tree.
