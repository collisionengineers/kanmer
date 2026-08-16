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
- R2a. **A skill install is a reconciliation, not an overlay.** The stamp records the bundled version on line 1 and, below it, the **roster** — the skill folders Kanmer wrote to that destination. Install replaces each owned folder **wholesale** (so a file the bundle has dropped or renamed cannot outlive it) and removes any roster-recorded folder the bundle no longer ships. Wholesale replacement discards local edits inside a Kanmer-owned skill folder; that is accepted under ADR-0009's "install-time copies", and Connect therefore **names the folders it replaced** in its output rather than deleting silently. Skills Kanmer did not write are never touched: the roster is the only deletion authority, never a name prefix. A stamp that predates the roster means "ownership unknown" and must make Kanmer delete less, not more. One **closed** tombstone list of two paths retired by `130f837` (`kanmer-import`, `kanmer-research/assets/impact-template.md`) repairs installs made before the roster existed; **nothing is ever added to it** — every later retirement is the roster's job, and a growing list would be a second source of truth about what Kanmer owns.
- R3. The **AGENTS.md managed block** is written for every provider — the universal orientation layer (ADR-0009), no longer anyone's sole delivery. Idempotent, marker-delimited, verified by `verify-agents-block`.
- R4. Disconnect reverses exactly what connect **wrote** (config entries, skill copies, never the AGENTS block without asking) — which means the recorded roster, not the currently-bundled names: a skill retired since that install was written by connect and must be removed by disconnect. Where one directory serves two hosts (`.agents/skills` — opencode and Antigravity), the copies are retained while a host writing **that** directory is still registered; ADR-0009 makes the roster's atomicity a stated constraint, so a half-removed roster breaks a connected host.
- R5. **Provider facts are re-verified against current host docs at implementation time** — a standing checklist item (this FRD's own history is the precedent).

## Acceptance criteria

1. Connect codex twice: one `[mcp_servers.kanmer]` entry in the project file, zero new global entries, legacy `kanmer-<project>` gone from `~/.codex/config.toml`.
2. Connect opencode and Antigravity: both discover the roster from one `.agents/skills/` tree; `/skills`-style listings show them.
3. Every merge/unmerge is pure and unit-tested (unknown keys preserved, idempotent, byte-stable re-merge).
4. A failed command yields the exact copy-paste fallback (shipped behaviour retained).
5. Install a bundle, retire a skill from it, install again: the retired skill is gone from the destination, a user-authored skill beside it survives byte for byte, and Connect's output names what it replaced and what it removed. Disconnect after a retirement leaves nothing behind either.

Related: ADR-0007 · ADR-0009 · D12/D35 · F2 · providers.ts registry.
