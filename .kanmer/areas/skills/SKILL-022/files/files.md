# Files — SKILL-022

## Add

| Path | Exact responsibility |
|---|---|
| `plugins/kanmer/skills/kanmer-plan/assets/approval-contract.md` | Human approval template with exact sections: Outcome, Why, User or operational effect, In scope, Out of scope, Key decisions, Main risks, Breakdown, Evidence, Approval boundary. State 300–600 words is guidance only and this asset never creates a gate. |
| `plugins/kanmer/skills/kanmer-tickets/assets/group-context.md` | Shared epic context template with Feature outcome, Users affected, Acceptance criteria, Non-goals, Shared decisions, Constraints, Risks, Dependency map, Rollout & rollback, Breakdown, Definition of done. Explain that per-ticket implementation detail is linked, not repeated. |

## Modify

| Path | Exact responsibility |
|---|---|
| `plugins/kanmer/skills/kanmer-plan/assets/plan-template.md` | Replace with bounded execution-brief sections: Objective, Starting state, Required changes, Expected files, Do not modify, Constraints, Ordered steps, Acceptance checks, Commands, Failure and deviation rules, Stop condition; retain required Governing docs. Add advisory unresolved-decision warning and prove-rule boilerplate. |
| `plugins/kanmer/skills/kanmer-plan/assets/checklist-template.md` | Align to ordered brief; document optional `[pre-review]`/`[post-merge]` labels and explicitly state gates ignore the labels. Include independently checkable production-caller/runtime-dependency/schema-grant checks when applicable. |
| `plugins/kanmer/skills/kanmer-plan/SKILL.md` | Reference approval-contract and new brief sections; instruct planner to resolve decision verbs before dispatch; select approval paragraph/template for human review; explain labels are advisory. Preserve gates-first routing from SKILL-020. |
| `plugins/kanmer/skills/kanmer-tickets/SKILL.md` | Reference `group-context.md` whenever creating an epic requiring shared context; do not require context for horizon groups. Keep group membership and ticket mechanics unchanged. |
| `scripts/verify-skill-prose.mjs` | Add narrow asset-presence/section checks and verify advisory wording; do not turn section prose/word count/checklist labels into runtime gates. |

## Inspect / consider

- `plugins/kanmer/skills/kanmer-tickets/assets/ticket-template.md`: keep ticket-body approval surface distinct; edit only if it falsely directs group context into tickets.
- `docs/functional/frd/FRD-023-agent-skills-system.md`: template behavior is already adopted; DOC-011 owns compiled-workflow deltas.
- MASTERPLAN §2, §4, S-10: authoritative audience split and canon rules.
- `packages/core/src/gates.ts`: confirms labels are ignored; no code change.

## Ripple effects

- MCP-023 extracts `Stop condition`; exact heading must be present and non-optional in the plan template.
- Weak implementers receive explicit file/scope/failure boundaries.
- Human approval becomes a separate compact artifact/paragraph rather than a plan dump.
- Group members share one context contract.
- Skill verification can catch missing sections/assets without scoring prose quality.

## Do not modify

- Core/MCP/GUI, profiles, gates, board.yml, document types, plugin binary, tool reference, package manifests, or lockfile.
- Add a word-count gate, decision-verb hard gate, checklist-label parser, or new pipeline document type.
- Create parent/child ticket semantics or require `context.md` for horizons.
