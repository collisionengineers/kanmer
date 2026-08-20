# Plan — SKILL-022: audience-specific approval, execution, and group templates

## Objective

Provide three distinct Markdown contracts so humans approve a compact outcome, weak implementers receive an exact bounded brief with a stop condition, and grouped tickets share one authoritative context without duplicating implementation detail.

## Starting state

- The current plan asset is a short reasoning outline without explicit file/scope/failure/stop boundaries.
- The checklist asset has no stage-label guidance or observed prove-rule boilerplate.
- No approval-contract or group-context asset exists.
- `kanmer-plan` and `kanmer-tickets` cannot point agents to these audience-specific surfaces.

## Governing docs

- **ADR-0009 / FRD-023:** templates guide skills but do not restate profile requirements or create a second gate authority.
- **EPIC-009 context:** supports the four-audience compiled workflow and bounded weak-agent packet without adding stages or gated document types.
- **MASTERPLAN §2, §4, S-10:** exact audiences, sections, advisory limits, prove rules, labels, and group semantics are implemented below.

## Required changes

### A. Approval contract asset

1. Add `plugins/kanmer/skills/kanmer-plan/assets/approval-contract.md`.
2. Begin with a note that it is a human approval surface, normally 300–600 words, and neither the range nor the asset is a gate.
3. Add exact ATX sections in this order:
   - Outcome
   - Why
   - User or operational effect
   - In scope
   - Out of scope
   - Key decisions
   - Main risks
   - Breakdown
   - Evidence
   - Approval boundary
4. Under Outcome, require one observable end state rather than a solution narrative.
5. Under User or operational effect, require plain-language impact and identify who notices the change.
6. Under In/Out of scope, require explicit boundaries that can be compared with the ticket/group breakdown.
7. Under Key decisions, list settled product/architecture choices; unresolved choices must not be delegated to implementation.
8. Under Main risks, include mitigation/rollback owner where material.
9. Under Breakdown, list ticket IDs/outcomes and dependency order, not internal step detail.
10. Under Evidence, state what will prove the outcome (checks, user observation, operational record).
11. Under Approval boundary, provide an explicit approval sentence: what approval authorizes and what remains separately controlled (implementation, merge, deployment as applicable).
12. Do not mention profile-specific required documents or imply the asset must be stored under a new doc type.

### B. Execution brief asset

13. Replace `plan-template.md` with an execution-brief template retaining the title and a concise distinction between plan reasoning and checklist execution.
14. Add exact sections in order:
   - Objective
   - Starting state
   - Governing docs
   - Required changes
   - Expected files
   - Do not modify
   - Constraints
   - Ordered steps
   - Acceptance checks
   - Commands
   - Failure and deviation rules
   - Stop condition
15. In Objective, require one bounded outcome.
16. In Starting state, require verified current behavior/components/constraints with source paths where known.
17. In Governing docs, preserve existing Meets/authorized Modifies/New ADR semantics and review responsibility.
18. In Required changes, require exact behavior/contract changes. Add a visible advisory block:
   - words such as `investigate`, `decide`, `choose`, or `determine` usually mean planner work remains;
   - resolve them before dispatch or convert the unknown to a spike;
   - the warning is advisory, not a gate/regex score.
19. In Expected files, use Add/Modify/Inspect tables and repo-root-relative paths; distinguish generated files.
20. In Do not modify, require explicit protected surfaces and forbidden scope.
21. In Constraints, include compatibility, dependency, path, security/data, performance, and architectural constraints that actually apply; avoid boilerplate lists unrelated to the ticket.
22. In Ordered steps, require granular numbered actions with inputs, target symbols/paths, expected result, and ordering dependencies. Prohibit “implement feature” summary steps.
23. In Acceptance checks, include generic boilerplate marked “when applicable”:
   - name the production caller/registration/route/composition entry;
   - prove runtime dependencies are present in the packaged/deployed artifact;
   - for schema changes, include migration, grants/bootstrap census, runtime-role permission check, rollback/data-loss handling in the same diff;
   - tests prove the claim and do not weaken assertions;
   - exact commands/exit codes are retained.
24. In Commands, separate focused implementation checks, full repository rail, and post-merge/environment checks; require cwd/environment.
25. In Failure and deviation rules, require stop/report on failing checks, unknown API/file, scope expansion, dependency addition, governing conflict, or unsafe command; deviations do not become silent redesigns.
26. In Stop condition, require one explicit final boundary including “do not merge” and “do not start another ticket” unless the approved skill phase says otherwise. Keep heading exactly `## Stop condition` for MCP-023 extraction.
27. Remove the old unconditional “research and files must exist” text so SKILL-020’s gates-first correction is not reintroduced.

### C. Checklist asset

28. Update `checklist-template.md` to say each checkbox derives from one ordered plan step/acceptance check and remains independently observable.
29. Show optional labels in examples:
   - `[pre-review]` for implementation/review-readiness evidence;
   - `[post-merge]` for exact merged-result verification.
30. State explicitly: labels are plain text for humans/skills; current Kanmer gates ignore them and gate behavior still comes from `get_doc_gates`/document existence.
31. Include optional applicable boilerplate checkboxes for production caller, packaged runtime dependencies, schema+grants/runtime-role proof, exact tests/commands, generated artifacts, and stop condition.
32. Preserve Progress notes and append guidance; do not claim appending is suitable for frontmatter records.
33. Do not make every boilerplate line mandatory for every ticket; instruct planner to remove non-applicable examples.

### D. Group context asset

34. Add `plugins/kanmer/skills/kanmer-tickets/assets/group-context.md`.
35. Explain it is the shared approval/constraint document for an epic/cross-ticket feature group, read before every member; horizons do not require it.
36. Add exact sections in this order:
   - Feature outcome
   - Users affected
   - Acceptance criteria
   - Non-goals
   - Shared decisions
   - Constraints
   - Risks
   - Dependency map
   - Rollout & rollback
   - Breakdown
   - Definition of done
37. Require criteria observable across integrated tickets, not per-file implementation instructions.
38. Require non-goals and shared decisions to prevent members independently relitigating scope.
39. Dependency map must identify blockers/blocked tickets and integration point using real IDs once allocated.
40. Rollout/rollback must distinguish code merge, release/deployment, migration, and operator actions where applicable.
41. Breakdown lists ticket outcome/owner/order and final integration ticket; implementation detail stays in each ticket’s plan.
42. Definition of done covers integrated feature outcome and final integration proof.

### E. Skill references

43. Update `kanmer-plan/SKILL.md` after SKILL-020’s gates-first text is present; do not overwrite/revert it.
44. Reference the execution brief as the default plan asset and list its load-bearing boundaries (Expected files, Do not modify, failure rules, Stop condition).
45. Add the advisory decision-verb check before hand-off. If unresolved decision remains, revise plan or file/use a spike; do not dispatch it.
46. Reference approval-contract for user-visible/contested/grouped work and require a short approval paragraph derived from it; do not require the whole asset for trivial work.
47. Explain checklist labels are advisory and ignored by gates.
48. Preserve governing-doc, open-question, scope-split, one-boundary, and hand-off logic.
49. Update `kanmer-tickets/SKILL.md` group creation flow to write/read `group-context.md` for epics needing shared context, using `set_group_doc(path:"context.md")` after creation.
50. State horizons need no context by default and group membership remains on tickets.
51. Do not introduce parent/child terminology or a new group/document type.

### F. Verification rail

52. Extend `verify-skill-prose.mjs` with deterministic assertions:
   - both new assets exist;
   - plan template contains each exact heading and one `## Stop condition`;
   - old unconditional research/files phrase is absent;
   - approval asset contains all exact headings and “guidance/not a gate” language;
   - group asset contains all exact headings and horizon-not-required guidance;
   - checklist asset contains both labels and an explicit “gates ignore” statement;
   - plan/skill mention the four decision verbs and advisory/no-hard-gate meaning;
   - acceptance boilerplate contains production caller, runtime artifact, schema/grants concepts.
53. Do not enforce 300–600 word count, score filled plan prose, parse checklist labels in core, or map profiles to templates.
54. Ensure verifier failure output names the missing asset/heading/phrase.

### G. Render and scope verification

55. Read each asset as Markdown and ensure headings/tables/fenced examples render without malformed nesting.
56. Run `npm run verify:skills`.
57. Run `git diff --check`.
58. Confirm diff contains only the seven expected skill/asset/verifier paths.
59. Confirm no MCP/core/GUI/profile/gate/tool-reference/plugin bundle/package/lock change.
60. Open PR with `Kanmer: SKILL-022` and include rendered snippets or links for all three audiences.

## Expected files

Add:
- `plugins/kanmer/skills/kanmer-plan/assets/approval-contract.md`
- `plugins/kanmer/skills/kanmer-tickets/assets/group-context.md`

Modify:
- `plugins/kanmer/skills/kanmer-plan/assets/plan-template.md`
- `plugins/kanmer/skills/kanmer-plan/assets/checklist-template.md`
- `plugins/kanmer/skills/kanmer-plan/SKILL.md`
- `plugins/kanmer/skills/kanmer-tickets/SKILL.md`
- `scripts/verify-skill-prose.mjs`

## Acceptance checks

- Three audience-specific templates exist and render.
- Plan template has every exact bounded-brief section and extractable Stop condition.
- Approval length/template remains advisory and ungated.
- Decision verbs produce an advisory planner warning, not a hard gate.
- Checklist labels are documented as ignored by gates.
- Prove-rule boilerplate appears and is explicitly conditional.
- Epic group context covers shared outcome/constraints/dependencies/rollout/integration; horizons remain optional.
- Skills reference assets without reverting gates-first behavior.
- `npm run verify:skills` passes and plugin bundle is untouched.

## Verification commands

```bash
npm run verify:skills
rg -n '^## (Objective|Starting state|Governing docs|Required changes|Expected files|Do not modify|Constraints|Ordered steps|Acceptance checks|Commands|Failure and deviation rules|Stop condition)$' plugins/kanmer/skills/kanmer-plan/assets/plan-template.md
rg -n '\[pre-review\]|\[post-merge\]|gates.*ignore|ignore.*gates' plugins/kanmer/skills/kanmer-plan/assets/checklist-template.md
rg -n 'production caller|runtime dependenc|schema.*grant|grant.*schema' plugins/kanmer/skills/kanmer-plan/assets/plan-template.md
git diff --check
git status --short
```

## Risks / open questions

- **Template becomes a gate:** deterministic presence checks could be mistaken for runtime enforcement. Mitigation: explicit advisory language; verifier only checks shipped assets, not user documents.
- **Boilerplate bloat:** every plan could copy irrelevant risks. Mitigation: “when applicable” and removal guidance.
- **Gates-first regression:** old prerequisite could return in template. Mitigation: explicit absence rail.
- **Audience mixing:** approval contract could become another technical plan. Mitigation: plain-language effect/boundary and no implementation-step section.
- No unresolved question remains.

## Failure and deviation rules

- Do not add core parsing/gates, word-count enforcement, label semantics, new document/group types, profile tables, or parent/child storage.
- Do not revert SKILL-020’s dynamic routing.
- If an asset requires a new durable product rule beyond the adopted sections, stop and route it to DOC-011/ADR rather than inventing it.
- Do not rebuild the MCP plugin, merge, or start another ticket.

## Stop condition

Stop when both new assets and both updated templates render with every required section/advisory, the two skills reference them without restating gates or reverting gates-first behavior, deterministic skill verification is green, only the seven scoped files changed, and the PR is ready for independent review. Do not merge or start another ticket.
