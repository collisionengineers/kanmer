# Research — SKILL-025: optional work-type brief overlays

## Question

How can `kanmer-plan` give an implementer domain-specific evidence prompts without adding a second workflow, new ticket fields, gates, or automatic classification?

## Findings

- `plugins/kanmer/skills/kanmer-plan/SKILL.md` currently directs planners to write only the shared plan and checklist from two assets. It has no work-type selection point and no assets beyond `plan-template.md` and `checklist-template.md`.
- The existing skill layout treats `assets/` as bundled, reusable Markdown guidance. Adding static asset files is consistent with the research/execute/docs skills and needs no MCP or core-schema change.
- MASTERPLAN S-30 is the controlling product brief. It fixes five optional overlays and their required concerns: fix, UI/UX, docs, cloud/infra, and data/migration. Its rationale is domain coverage from observed Pegasus failures and standing risks, explicitly **never engines**.
- The planner is the correct caller: it has already read the ticket’s research/files documents and can select one or more overlays based on the actual work. An automatic selector, a required field, or profile-to-template mapping would recreate the forbidden engine/second source of truth.
- `scripts/verify-skill-prose.mjs` is the existing dependency-free verifier for the skill tree. A small static assertion can prove that the five canonical assets exist and that `kanmer-plan` still states their optional/manual use; no new test framework is needed.
- EPIC-012 requires Kanmer-owned guidance to be reconcilable and integration-proven eventually. This ticket supplies planner assets only; SKILL-026 remains the integration verification owner.

## Decision

Add five clearly named Markdown overlays under `plugins/kanmer/skills/kanmer-plan/assets/` and one concise `kanmer-plan` instruction telling a planner to copy only the relevant overlay(s) into an execution brief. Do not infer a type, record a type, require an overlay, or alter the plan/checklist pipeline.

## Implications

- The asset text must be concise, independently useful, and phrased as planning/evidence prompts rather than as policy gates.
- Each overlay should contain only the concerns named in S-30, with an explicit scope boundary where the ticket requires one.
- Verification should be static and portable: run the existing skill-prose verifier plus inspect the five files and selection guidance.
- No user-only design decision remains; the asset filenames below are an implementation convention, not a product choice.

## Open questions

- None.
