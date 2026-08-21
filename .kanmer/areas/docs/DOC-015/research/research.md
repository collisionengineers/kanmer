# Research — DOC-015: Lean greenfield playbook

## Question

Where should Kanmer place a short, reusable guide for starting a greenfield project without turning the initial brief into a speculative lifetime backlog, and how should setup direct users to it?

## Findings

- `plugins/kanmer/skills/kanmer-setup/SKILL.md` has the authoritative greenfield interview in section 6. It currently requires a brief, maps it to `docs/product/vision.md`, splits governing documents, materialises the docs tree, then proposes areas/profiles/backlog counts for explicit user confirmation. It does not explain how much detail is appropriate at each project stage.
- FRD-013 R5 requires the brief interview and docs-tree materialisation; FRD-009 R1/R2 requires genuine user-owned uncertainty to be surfaced, proportionally, before forward decisions. A playbook can make that guidance actionable without changing the setup contract.
- `docs/manual/` contains end-user Markdown guides such as `getting-started.md`, `first-ticket.md`, and `documents.md`. A new `docs/manual/greenfield.md` is the narrow, durable home for an operator-facing playbook; it avoids overloading product governance or the setup skill with long-form advice.
- The existing greenfield steps already preserve the two key safety boundaries: no invented product without a brief, and no materialised board/backlog without a user-approved preview. The new guide should reinforce—not weaken—those boundaries.
- The requested strategy is settled by the ticket: choose an assurance depth (lean, standard, high-assurance); write a one-page brief and non-goals; build a walking skeleton before a general framework; detail only the first horizon; replan after the first real release. The anti-sprawl rule is explicit: do not pre-author a lifetime backlog before evidence exposes the assumptions.
- EPIC-012’s shared contract concerns AGENTS.md ownership and does not add product requirements. HZN-006 has no context document. Neither creates a user-only decision for this scoped documentation change.

## Implications

Add one concise manual page that turns the ticket’s sequence into a repeatable playbook, clarifies the three depth choices, keeps each phase’s output bounded, and names evidence-based replanning. Add a single nearby link in setup’s greenfield interview so agents can surface the playbook before collecting/annotating a brief. Keep all board creation, profiles, governance-doc decomposition, and AGENTS ownership behaviour unchanged.

## Sources

- `plugins/kanmer/skills/kanmer-setup/SKILL.md` §6, read 2026-08-21.
- `docs/functional/frd/FRD-013-setup-as-reconciliation.md` R5.
- `docs/functional/frd/FRD-009-interrogative-workflow.md` R1–R5.
- `docs/manual/` inventory, read 2026-08-21.

## Open questions

None. The ticket fixes the content and the existing setup contract fixes the integration point.
