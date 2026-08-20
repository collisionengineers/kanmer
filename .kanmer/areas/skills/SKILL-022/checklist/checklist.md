# Checklist — SKILL-022

## Approval contract

- [ ] Add `approval-contract.md` under kanmer-plan assets.
- [ ] State 300–600 words is guidance and the asset is never a gate.
- [ ] Add exact sections: Outcome, Why, User or operational effect, In scope, Out of scope, Key decisions, Main risks, Breakdown, Evidence, Approval boundary.
- [ ] Require observable outcome, plain-language effect, explicit scope/non-scope, settled decisions, risks, ticket breakdown, evidence, and exact approval authorization.
- [ ] Avoid implementation-step detail and profile/document restatements.

## Execution brief/checklist

- [ ] Replace plan template with every exact brief heading, including Governing docs and `## Stop condition`.
- [ ] Remove the unconditional research/files prerequisite.
- [ ] Add advisory warning for `investigate`, `decide`, `choose`, `determine` in Required changes.
- [ ] State unresolved decisions are resolved or converted to a spike before dispatch; no hard gate.
- [ ] Add Expected files and Do not modify boundaries with repo-relative/generated-file guidance.
- [ ] Add granular Ordered steps and explicit Constraints/Commands/Failure rules.
- [ ] Add conditional acceptance boilerplate for production caller, runtime artifact dependency, and schema migration/grants/runtime-role proof.
- [ ] Require exact command/exit evidence and non-weakened tests.
- [ ] Make Stop condition prohibit merge/continuation unless the approved phase explicitly owns them.
- [ ] Update checklist template with independently checkable boxes and Progress notes.
- [ ] Document optional `[pre-review]` and `[post-merge]` labels.
- [ ] State current gates ignore these labels and live gate behavior comes from `get_doc_gates`.
- [ ] Mark prove-rule boilerplate as remove-when-not-applicable guidance.

## Group context

- [ ] Add `group-context.md` under kanmer-tickets assets.
- [ ] State it is for epic/cross-ticket shared approval context; horizons do not require it by default.
- [ ] Add exact sections: Feature outcome, Users affected, Acceptance criteria, Non-goals, Shared decisions, Constraints, Risks, Dependency map, Rollout & rollback, Breakdown, Definition of done.
- [ ] Keep criteria integrated/observable and implementation detail on member tickets.
- [ ] Require real dependency ticket IDs after allocation and a final integration outcome.

## Skill wiring and verification

- [ ] Update kanmer-plan to reference approval/brief/checklist assets without reverting SKILL-020 gates-first routing.
- [ ] Require planner decision-verb sanity check and compact approval paragraph.
- [ ] Explain checklist labels are advisory.
- [ ] Update kanmer-tickets epic creation to use group-context via `set_group_doc(context.md)`; keep horizons optional and membership unchanged.
- [ ] Add deterministic verifier checks for asset existence, exact headings, advisory wording, stop condition, labels, and prove-rule concepts.
- [ ] Do not enforce filled-document word count/content quality or profile mappings.
- [ ] Render/read all assets and fix malformed Markdown.
- [ ] Run `npm run verify:skills` and retain output.
- [ ] Run the specified heading/label/prove-rule searches.
- [ ] Run `git diff --check`.
- [ ] Confirm only the seven expected skill/asset/verifier files changed.
- [ ] Confirm no core/MCP/GUI/profile/gate/tool/plugin/package/lock change.
- [ ] Open PR with `Kanmer: SKILL-022` and show each audience surface.
- [ ] Stop at review readiness; do not merge or start another ticket.

## Progress notes

Append rendered-asset review, verifier output, exact changed paths, and any advisory wording corrections here.
