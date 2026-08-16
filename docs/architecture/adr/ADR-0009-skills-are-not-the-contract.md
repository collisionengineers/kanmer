---
status: draft
---

# ADR-0009 — Skills are not the contract; skills derive rules, never restate them

## Context

All five supported hosts now load agent skills (verified 2026-08-15): Claude Code and codex via the plugin; grok via its skills dir / Claude compat; opencode natively (project `.opencode/skills/`, plus Claude-compatible `.claude/skills/` and agent-compatible `.agents/skills/`); Antigravity at project `<root>/.agents/skills/`. An earlier premise of this ADR — that two hosts received no skills at all — was **wrong**: it repeated Phase-6-era provider research that had gone stale (a live demonstration of the doc-drift problem this ADR exists to counter).

What remains true on every host: skills are **on-demand** (loaded only when the agent judges them relevant), often **permission-gated** (opencode: allow/deny/ask per skill), **install-time copies** that go stale between updates, and **prose** an agent can fail to follow. Meanwhile shipped skills hardcoded gate rules in prose (kanmer-auto restates four gates), which profiles (ADR-0003) make per-ticket-wrong.

## Decision

The contract hierarchy is: (1) **server-enforced gates** — the only layer that cannot be skipped; (2) **MCP tool descriptions** — every client reads them on every session; `get_doc_gates` teaches profiles in two sentences; (3) **the AGENTS.md managed block** — universal orientation, always in context (profiles exist; call get_doc_gates before moving; read the whole ticket folder and group context); (4) **skills** — workflow choreography, best-effort by nature. Skills never restate enforceable rules: they call `get_doc_gates` and do what it says.

Supporting files *inside* a skill directory are fine — every host's skill spec ships them. **Cross-skill** references (e.g. skills pointing at `kanmer-tickets/references/tool-reference.md`) are permitted only because Connect installs the roster atomically as sibling directories; that is a stated constraint on installs, not an assumption. No new cross-skill shared files are added (the questioning behaviour is per-skill prose by explicit user decision).

Provider install specs are **re-verified against current host documentation at implementation time** — this ADR's own correction is the precedent: skill-ecosystem facts go stale in weeks. Convergence note for Connect: one project-scoped write to `.agents/skills/` serves both opencode and Antigravity.

## Alternatives considered

(a) Skills as the primary rulebook — skips the on-demand/permission/staleness reality; one unloaded skill silently voids the rules. (b) A shared asking/rules reference file across skills — adds a cross-skill coupling for content the user explicitly wants as tailored per-skill prose.

## Consequences

Skills get shorter and drift-proof; behaviour degrades gracefully when a skill isn't loaded; the AGENTS block and tool descriptions join the release rail as reviewed surfaces; Connect upgrades opencode/antigravity from AGENTS-block-only installs to real project-scoped skill installs.
