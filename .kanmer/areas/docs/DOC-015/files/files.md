# Files — DOC-015: Lean greenfield playbook

## Change surface

| Path | Change | Risk / ripple |
|---|---|---|
| `docs/manual/greenfield.md` (new) | Add the concise operator-facing playbook: depth choice, one-page brief/non-goals, walking skeleton, first-horizon planning, first-release replanning, and anti-sprawl guardrails. | Low. It must be concrete enough to guide setup without duplicating or redefining FRD requirements. |
| `plugins/kanmer/skills/kanmer-setup/SKILL.md` | Link to the playbook at the start of the greenfield interview, preserving the current brief-first and preview-before-create workflow. | Medium prose-contract risk: this skill is bundled/staleness-sensitive and must retain existing instructions verbatim except for the additive reference. |

## Context files

| Path | Why read it |
|---|---|
| `docs/functional/frd/FRD-013-setup-as-reconciliation.md` | Defines the durable greenfield setup contract: brief interview, docs tree, and ticket seeding. |
| `docs/functional/frd/FRD-009-interrogative-workflow.md` | Defines proportional user questioning and the no-forward-guess rule. |
| `docs/manual/getting-started.md` | Establishes the style and intended audience of manual pages. |
| `scripts/verify-skill-prose.test.mjs` | Existing dependency-free static test surface for skill prose; inspect if a durable assertion is warranted. |

## Deliberately out of scope

- Changing the greenfield setup algorithm, board creation, generated docs tree, profile selection, or ticket seeding.
- Creating or modifying a PRD, FRD, or ADR.
- Altering the Kanmer-managed AGENTS.md block or its reconciliation ownership.
- Building a permanent backlog template or prescribing a product-specific architecture.
