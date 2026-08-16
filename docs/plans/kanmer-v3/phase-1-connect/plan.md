# Phase 1 — Connect rework (FRD-012)

**Goal:** one codex entry per project (project-scoped `.codex/config.toml`, legacy global entries drained) and real project-scoped skill installs for opencode + Antigravity via one `.agents/skills/` write. Independent of the format work — ship early.

**Depends on:** nothing (Phase 0 in parallel). **Feeds:** Phase 6 (skills land where every host reads them).

## Items

### 1.1 codex → configFile provider — M · [[GUI-002]]
- **Where:** `apps/gui/src/main/providers.ts` (the codex entry + `cliAddCommand`), `providers.test.ts`.
- Register kind `configFile`: path `<root>/.codex/config.toml`; pure TOML `merge`/`unmerge` for `[mcp_servers.kanmer]` preserving unknown tables/keys (small dep: `smol-toml`). `removeCommands` retains `codex mcp remove kanmer-<project>` as the **legacy cleanup**, run best-effort on connect and disconnect. Connect UI surfaces the trust caveat ("codex loads project config only for trusted folders").

### 1.2 opencode + Antigravity → project skills — M · [[GUI-003]]
- Install kind `copySkills` scope project, dir `.agents/skills/` (one tree serves both hosts); stamp `.kanmer-skills-version`; the existing update-offer flow covers refresh. opencode's `opencode.json` MCP registration unchanged; Antigravity registration unchanged. AGENTS block still written for all (orientation layer).

### 1.3 Provider re-verification checkpoint — S · [[GUI-004]]
- Before coding 1.1/1.2: re-check each host's current docs (registration paths, skill dirs, trust rules) and record findings in the plan footer — ADR-0009's standing rule, born from this roadmap's own stale-fact incident.

## Release rail
No tool changes. README "Connect an agent manually" section updated (the codex project-file example already exists — align GUI behaviour with it). `verify-agents-block` still green.

## Verification
- providers.test.ts: TOML merge idempotent + unknown-key-preserving + byte-stable re-merge; unmerge removes only kanmer; codex entry asserts configPath + legacy removeCommands; opencode/antigravity install specs assert `.agents/skills` + stamping.
- Manual: connect codex twice on a real project → one project entry, global drained; opencode and AGY skill listings both show the roster from the single tree.

---

## Provider re-verification footer (1.3, 2026-08-16)

Verified against the **installed CLIs** on the dev machine plus current official docs. Full
record in [[GUI-004]]'s `research.md`. **FRD-012's matrices are correct — no provider fact
changed.** The load-bearing confirmations and the new facts:

| Host | Registration | Skills | Status |
|---|---|---|---|
| Claude Code | `claude mcp add kanmer -s project` (`-s` = local\|user\|project, default **local**) | marketplace | unchanged |
| codex | project `.codex/config.toml`, `[mcp_servers.kanmer]` | marketplace | **changes (1.1)** |
| opencode | `opencode.json` | `.agents/skills/` — search position 5 of 6 | **changes (1.2)** |
| Grok | project `.mcp.json` | `./.grok/skills/` — **does not read `.agents/skills`** | unchanged |
| Antigravity | `.agents/mcp_config.json` | `.agents/skills/` — primary location | **changes (1.2)** |

- **`codex mcp add` has no scope flag** and always writes `~/.codex/config.toml`. Hand-merging
  the project TOML is the only route, so ADR-0007 is necessary rather than merely tidier.
- **`codex mcp remove` exists** (`codex mcp --help`: list, get, add, remove, login, logout) even
  though the published docs omit it. 1.1's legacy cleanup is safe.
- codex stdio keys: `command` (required), `args`, `env`. Precedence: CLI flags > project config
  (**trusted only**) > profile > user > system > defaults.
- One `.agents/skills/` write serves opencode **and** Antigravity, as R2 assumes — but not Grok.

New facts, all with consequences for 1.1:

1. **Trust lives in the global config**, as `[projects.'<path>'] trust_level = "trusted"`. It is
   therefore *checkable* — Connect should report whether this folder is trusted instead of
   showing an unconditional caveat.
2. **Windows path keys are lowercased with inconsistent quoting** (45 single-quoted vs 1
   double-quoted on the dev machine). The merge must compare paths case-insensitively and
   preserve quote style.
3. **Trust may inherit from a parent path** — a trusted `c:\users\pc` would cover everything
   beneath it. Exact-vs-ancestor matching is unverified and must be resolved before shipping the
   check in (1), or it will report trusted folders as untrusted.
4. **Grok filters repo-scoped skills through `.gitignore`** — a repo ignoring `.grok/` silently
   loses the roster with no error. Connect should warn when the install path lands ignored.
