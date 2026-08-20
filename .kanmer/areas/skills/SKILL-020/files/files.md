# Files — SKILL-020

## Modify

| Path | Exact responsibility |
|---|---|
| `plugins/kanmer/skills/kanmer-plan/SKILL.md` | Remove the unconditional research/files prerequisite from the introduction and workflow step 1. Route from `get_doc_gates`; fetch research/files only when required or when a named material hole prevents a non-speculative plan. Change the default human-facing hand-off to a short approval paragraph before execution when approval is required. Preserve governing-doc, question-resolution, scope-split, one-boundary, and final hand-off rules. |
| `plugins/kanmer/skills/kanmer-auto/SKILL.md` | Replace “Wave 0 — research everything in parallel” with per-ticket `get_doc_gates` routing. Dispatch only each ticket’s next required phase; preserve roster filtering, question parking, dependencies, file-overlap lanes, ~3-lane cap, `.worktrees/kanmer` invariant, rebase rule, target-point semantics, and phase-skill delegation. |
| `scripts/verify-skill-prose.mjs` | Add narrow regression checks that reject the removed unconditional planning claim and universal-research Wave 0, while confirming both skills still use `get_doc_gates`. Do not add profile-to-document mappings. |

## Inspect / consider

| Path | Why |
|---|---|
| `plugins/kanmer/skills/kanmer-plan/assets/plan-template.md` | Ensure rewritten skill still points to the current plan asset; no template change belongs in this ticket (SKILL-022 owns it). |
| `plugins/kanmer/skills/kanmer-plan/assets/checklist-template.md` | Same; keep checklist mechanics unchanged. |
| `plugins/kanmer/skills/kanmer-research/SKILL.md` | Defines the phase invoked only when gates/material uncertainty justify it. Do not change it here. |
| `plugins/kanmer/skills/kanmer-execute/SKILL.md` | Receives planned tickets; SKILL-021 owns packet/SHA changes. Do not pre-empt them. |
| `packages/core/src/profiles.ts` | Source of resolved gates used by MCP; never copy its mappings into skill prose or verifier. |
| `docs/functional/frd/FRD-023-agent-skills-system.md` | Governing “skills derive, never restate” contract. The ticket corrects conformance; no FRD edit is required here. |
| `.kanmer/groups/EPIC-009/context.md` | Requires gates-first weak-agent execution and forbids new workflow machinery. |
| `MASTERPLAN.md` S-08 | Exact defect/remedy and skill-only packaging boundary. |

## Required phrase-level changes

- Remove/supersede every statement equivalent to “research and files must exist regardless of profile”.
- Remove the heading and instruction “Wave 0 — research everything in parallel”.
- Do not replace either with examples mapping `feature`, `fix`, `chore`, `spike`, or `custom` to documents.
- Keep the phrases/rules for one gated boundary, `get_doc_gates`, lane cap around three, and `.worktrees/kanmer` safety.

## Ripple effects

- Small chores can be planned/executed without ceremonial research/files when their live gate report does not require them and no material hole exists.
- Automated batches become heterogeneous: tickets may be researching, planning, or directly advancing in the same wave according to live gates.
- The new verifier blocks future prose regression before merge/release.
- No installed MCP bundle, tool reference, generated plugin binary, package lock, or board configuration changes.

## Do not modify

- Any phase skill other than `kanmer-plan` and `kanmer-auto`.
- Plan/checklist templates (SKILL-022).
- Profile/gate source code or `board.yml`.
- MCP tools, GUI, plugin binary, package dependencies, or release rail beyond the skill verifier script.
