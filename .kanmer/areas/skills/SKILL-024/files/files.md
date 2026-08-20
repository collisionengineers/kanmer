# Files — SKILL-024

## Where the change lands

| Path | Why |
|---|---|
| `plugins/kanmer/skills/kanmer-setup/SKILL.md` | Add the ordered AGENTS skeleton reconciliation instructions, including the missing/partial/complete cases, idempotent follow-up ticket marker, and reporting rule. |
| `scripts/verify-skill-prose.test.mjs` | Extend the dependency-free skill contract test so the setup skill continues to name the canonical asset, all three cases, preservation boundary, and idempotent source marker. |
| `scripts/verify-skill-prose.mjs` (only if needed) | Add a stable verifier rule only if existing generic skill checks cannot express the new setup contract; keep it scoped to the skill prose. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `plugins/kanmer/skills/kanmer-docs/assets/agents-template.md` | The sole user-owned skeleton to copy for a missing file; it defines the exact five headings and TODO/verification shape. |
| `plugins/kanmer/skills/kanmer-docs/SKILL.md` | Existing authoritative missing-versus-present behavior and the rule that the asset must not copy or redefine the marker block. |
| `scripts/agents-block.mjs` | The marker writer’s guarantees: safe refresh/prepend, malformed-marker refusal, and byte preservation outside markers. Setup must call it rather than reimplement it. |
| `scripts/verify-agents-block.mjs` | Existing disposable-directory evidence for managed-block idempotency and malformed marker safety; it is writer coverage, not skeleton ownership. |
| `docs/functional/frd/FRD-013-setup-as-reconciliation.md` | Setup is a repeatable reconciliation path and the managed-block verification rail must remain valid. |
| `docs/functional/frd/FRD-023-agent-skills-system.md` | Skills are the shipped agent instruction surface, so the contract needs a focused release check. |
| `docs/architecture/adr/ADR-0015-staleness-by-content-not-version.md` | Managed-block drift remains content-hash detection with explicit repair; this ticket must not add automatic repair or a second body source. |

## Ripple effects

- The plugin skill release rail may require `npm run verify:skills`; the change is prose-only, so no MCP tool reference, server source, GUI, or committed MCP bundle should change.
- A target repository with no AGENTS.md receives the existing template plus the existing managed block, then one idempotently source-marked backlog documentation ticket once a board exists.
- SKILL-026 remains the integration-verification owner and should consume this completed behavior rather than being absorbed into this ticket.

## Out of scope

- Changing `scripts/agents-block.mjs`, `scripts/agents-block-body.mjs`, GUI Connect, core staleness logic, or the managed block’s conduct content.
- Writing into an existing project’s human-authored AGENTS.md prose, completing its TODOs, judging prose quality, or changing its heading level/style.
- Broad documentation-authoring work beyond the one source-marked follow-up ticket required for a newly created skeleton.
