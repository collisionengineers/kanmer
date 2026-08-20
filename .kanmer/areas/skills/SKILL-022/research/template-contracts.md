# Research — SKILL-022: audience-specific planning templates

## Questions

1. Which current templates force technical detail into the wrong audience surface?
2. What exact template sections give a weak implementer bounded work without turning prose into a hard gate?
3. How should advisory checklist labels and unresolved-decision language be explained?

## Findings

- The current plan template contains only Approach, Governing docs, Steps, Verification, and Risks/open questions. It says every plan is written from research/files, lacks expected/do-not-modify file boundaries, failure/deviation rules, and a stop condition.
- The current checklist template is generic and does not teach pre-review/post-merge labels or the canon’s “done means wired” evidence.
- There is no approval-contract asset. Ticket bodies and group context therefore tend to carry the same technical detail as execution plans, making human approval unreadable.
- `kanmer-tickets` has only `ticket-template.md`; there is no group-context asset even though epic `context.md` is the shared approval/constraint surface.
- MASTERPLAN’s four-audience model requires three distinct templates here:
  1. approval contract for a human decision;
  2. execution brief for a weak implementer;
  3. group context for a cross-ticket shared contract.
- The approval contract’s 300–600-word range is guidance only. No parser/gate/word-count enforcement may be added.
- The execution brief must resolve decisions before dispatch. Terms `investigate`, `decide`, `choose`, and `determine` in **Required changes** are an advisory smell because they delegate planner work to the implementer. The warning belongs in template prose and kanmer-plan guidance, not a hard MCP gate.
- `[pre-review]` and `[post-merge]` are human/skill labels in checklist text. Current gates count checkbox completion/existence without interpreting these labels; the template must state this explicitly so users do not believe tags alter gate behaviour.
- Acceptance boilerplate must carry the observed prove-rules:
  - name the production caller/registration/route;
  - prove required runtime dependencies ship in the deployable artifact;
  - when a schema changes, migration/grants/bootstrap/runtime-role proof ride the same diff.
- The group template needs outcome and dependency/rollout information shared by all members, while per-ticket implementation detail stays on tickets.

## Decisions

- Add exactly two new assets and replace the existing plan asset; update checklist asset and kanmer-plan references/guidance.
- Keep all template checks advisory and render/lint based; do not change profiles, gates, document types, or tool schemas.
- The templates may contain comments/instructions that users remove or replace, but generated/filled examples must remain plain Markdown.

## Remaining unknowns

None. Section names, guidance range, advisory language, and prove-rule boilerplate are fixed by MASTERPLAN S-10.
