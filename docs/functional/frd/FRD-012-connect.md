---
status: draft
covers: shipped Connect (5 providers, registry, AGENTS block, skill stamping) + codex project scoping & universal project-skill installs (v3)
---

# FRD-012 — Connect: agent registration & skill install

## Overview

Connect registers the project's board with an agent host's MCP client and installs the skill roster — per provider, idempotently, with a copy-paste fallback when a command fails. Five providers: Claude Code, codex, opencode, Grok CLI, Antigravity.

## Requirements

- R1. **Registration matrix (end-state):** Claude Code — `claude mcp add kanmer -s project` (project `.mcp.json`; stale user-scope cleanup retained). **codex — project config file** `<root>/.codex/config.toml` (`[mcp_servers.kanmer]`, TOML merge preserving unknown keys, idempotent unmerge), with the *project must be trusted* caveat surfaced in the UI, plus legacy cleanup `codex mcp remove kanmer-<project>` on reconnect (drains the old global entries). opencode — `opencode.json` merge (as shipped). Grok — as shipped. Antigravity — config file (as shipped).
- R2. **Skill install matrix (end-state):** Claude Code + codex — plugin marketplace (as shipped). **opencode + Antigravity — project-scoped copy to `.agents/skills/`** (one write serves both; replaces AGENTS-block-only installs). Grok — its skills dir / Claude-compat (as shipped). All copies stamped (`.kanmer-skills-version`) with the existing update-offer flow.
- R3. The **AGENTS.md managed block** is written for every provider — the universal orientation layer (ADR-0009), no longer anyone's sole delivery. Idempotent, marker-delimited, verified by `verify-agents-block`.
- R4. Disconnect reverses exactly what connect wrote (config entries, skill copies, never the AGENTS block without asking).
- R5. **Provider facts are re-verified against current host docs at implementation time** — a standing checklist item (this FRD's own history is the precedent).

## Acceptance criteria

1. Connect codex twice: one `[mcp_servers.kanmer]` entry in the project file, zero new global entries, legacy `kanmer-<project>` gone from `~/.codex/config.toml`.
2. Connect opencode and Antigravity: both discover the roster from one `.agents/skills/` tree; `/skills`-style listings show them.
3. Every merge/unmerge is pure and unit-tested (unknown keys preserved, idempotent, byte-stable re-merge).
4. A failed command yields the exact copy-paste fallback (shipped behaviour retained).

Related: ADR-0007 · ADR-0009 · D12/D35 · F2 · providers.ts registry.
