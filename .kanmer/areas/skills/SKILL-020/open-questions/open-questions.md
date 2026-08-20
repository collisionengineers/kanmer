# Open questions — SKILL-020

All implementation decisions are resolved.

- [x] **What is authoritative for deciding preparation work?** — The current ticket’s `get_doc_gates` response, not the skill prose or `board.yml`.
- [x] **May planning read/create research or files when gates do not require them?** — Only when a concrete material uncertainty or exact-file/contract hole would otherwise make the plan speculative; the skill must name that hole.
- [x] **Should every auto run begin with research?** — No. Wave 0 reads per-ticket gates and dispatches only each ticket’s next required phase.
- [x] **May the rewritten skills include examples of which documents named profiles require?** — No. That would restate configuration and violate FRD-023 R1.
- [x] **What remains unchanged in auto?** — Roster/drop rules, user roster report, one-boundary rule, dependency order, overlap lanes, ~3-lane cap, board-worktree invariant, question parking, rebase rule, target-point semantics, and phase-skill mechanics.
- [x] **What is the default human hand-off from planning?** — A short approval paragraph summarising outcome/scope/risks/approval boundary when approval is needed; execution follows approval rather than an automatic document dump.
- [x] **How is regression prevented?** — Targeted assertions in `verify-skill-prose.mjs` reject the two known universal-pipeline claims and require continued `get_doc_gates` routing.
- [x] **Does this ticket rebuild the plugin bundle?** — No. It is a skill/verifier-only change.

## Parked (explicitly deferred)

No questions are parked.
