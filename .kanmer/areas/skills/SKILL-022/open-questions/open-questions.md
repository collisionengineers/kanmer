# Open questions — SKILL-022

All template decisions are resolved.

- [x] **Is the approval contract a new gated document?** — No. It is an optional planning asset/human hand-off; 300–600 words is guidance only.
- [x] **Which approval sections are mandatory in the asset?** — Outcome, Why, User or operational effect, In scope, Out of scope, Key decisions, Main risks, Breakdown, Evidence, Approval boundary.
- [x] **Which execution-brief sections are required?** — Objective, Starting state, Governing docs, Required changes, Expected files, Do not modify, Constraints, Ordered steps, Acceptance checks, Commands, Failure and deviation rules, Stop condition.
- [x] **How are unresolved-decision verbs handled?** — Advisory warning in template/skill when Required changes contains `investigate`, `decide`, `choose`, or `determine`; planner resolves them before dispatch or converts the unknown into a spike. No hard gate.
- [x] **What prove-rule boilerplate is included?** — Name production caller; runtime dependencies ship in artifact; schema change and grants/bootstrap/runtime-role proof ride the same diff when applicable.
- [x] **What do `[pre-review]` and `[post-merge]` do?** — They are optional human/skill labels only; current gates ignore them.
- [x] **Which groups receive the group-context asset?** — Epics/cross-ticket feature groups that need a shared approval contract; horizons do not require one.
- [x] **Does this ticket alter profiles, gates, document types, parent/child storage, or plugin bundle?** — No.
- [x] **How is template drift checked?** — Deterministic asset/section/advisory-text assertions in `verify-skill-prose.mjs`, not LLM prose scoring.

## Parked (explicitly deferred)

No questions are parked.
