# Checklist — SKILL-022

## Approval contract

- [x] Add `approval-contract.md` under kanmer-plan assets.
- [x] State 300–600 words is guidance and the asset is never a gate.
- [x] Add exact sections: Outcome, Why, User or operational effect, In scope, Out of scope, Key decisions, Main risks, Breakdown, Evidence, Approval boundary.
- [x] Require observable outcome, plain-language effect, explicit scope/non-scope, settled decisions, risks, ticket breakdown, evidence, and exact approval authorization.
- [x] Avoid implementation-step detail and profile/document restatements.

## Execution brief/checklist

- [x] Replace plan template with every exact brief heading, including Governing docs and `## Stop condition`.
- [x] Remove the unconditional research/files prerequisite.
- [x] Add advisory warning for `investigate`, `decide`, `choose`, `determine` in Required changes.
- [x] State unresolved decisions are resolved or converted to a spike before dispatch; no hard gate.
- [x] Add Expected files and Do not modify boundaries with repo-relative/generated-file guidance.
- [x] Add granular Ordered steps and explicit Constraints/Commands/Failure rules.
- [x] Add conditional acceptance boilerplate for production caller, runtime artifact dependency, and schema migration/grants/runtime-role proof.
- [x] Require exact command/exit evidence and non-weakened tests.
- [x] Make Stop condition prohibit merge/continuation unless the approved phase explicitly owns them.
- [x] Update checklist template with independently checkable boxes and Progress notes.
- [x] Document optional `[pre-review]` and `[post-merge]` labels.
- [x] State current gates ignore these labels and live gate behavior comes from `get_doc_gates`.
- [x] Mark prove-rule boilerplate as remove-when-not-applicable guidance.

## Group context

- [x] Add `group-context.md` under kanmer-tickets assets.
- [x] State it is for epic/cross-ticket shared approval context; horizons do not require it by default.
- [x] Add exact sections: Feature outcome, Users affected, Acceptance criteria, Non-goals, Shared decisions, Constraints, Risks, Dependency map, Rollout & rollback, Breakdown, Definition of done.
- [x] Keep criteria integrated/observable and implementation detail on member tickets.
- [x] Require real dependency ticket IDs after allocation and a final integration outcome.

## Skill wiring and verification

- [x] Update kanmer-plan to reference approval/brief/checklist assets without reverting SKILL-020 gates-first routing.
- [x] Require planner decision-verb sanity check and compact approval paragraph.
- [x] Explain checklist labels are advisory.
- [x] Update kanmer-tickets epic creation to use group-context via `set_group_doc(context.md)`; keep horizons optional and membership unchanged.
- [x] Add deterministic verifier checks for asset existence, exact headings, advisory wording, stop condition, labels, and prove-rule concepts.
- [x] Do not enforce filled-document word count/content quality or profile mappings.
- [x] Render/read all assets and fix malformed Markdown.
- [x] Run `npm run verify:skills` and retain output.
- [x] Run the specified heading/label/prove-rule searches.
- [x] Run `git diff --check`.
- [x] Confirm only the seven expected skill/asset/verifier files changed.
- [x] Confirm no core/MCP/GUI/profile/gate/tool/plugin/package/lock change.
- [x] Open PR with `Kanmer: SKILL-022` and show each audience surface.
- [x] Stop at review readiness; do not merge or start another ticket.

## Progress notes

Completed 2026-08-20: rendered/read the assets; npm run verify:skills and npm run test:scripts passed; heading/label/prove-rule searches, node --check scripts/verify-skill-prose.mjs, and git diff --check passed. The seven changed paths match the plan. Corrected the approval asset's wording from “impact” to “change” because the global document-type verifier reserves “impact” as a pipeline document word. PR #86 is open; stop at Review.
