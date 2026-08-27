# Open questions — SKILL-037

None blocking. The operator has already ruled (controller brief, 2026-08-27) that Codex/GitHub bot reviews are not a gate; "expected reviewers" means the independent subagent reviewer(s) named for the ticket.

## Parked (explicitly deferred)

- [ ] Should `expected_reviewers` / `threads_snapshot` / `failure_class` become schema-required in `packages/core` once every live attestation carries them? Deferred to a later core ticket; this ticket keeps them optional in the parser and mandatory only in skill procedure.
- [ ] Should the store enforce delta-review scope (findings-only + changed lines) mechanically? Deferred to CORE-118 / SKILL-036.
