# Open questions — SKILL-023

## Resolved

- [x] What is the canon? MASTERPLAN §4's 24 numbered rules, compacted to one line per rule under Scope, Build, Prove, and Conduct.
- [x] Where is the source of truth? `scripts/agents-block-body.mjs`; the setup skill's fenced copy stays byte-identical under the existing verifier.
- [x] How does staleness work? Existing `get_status.repo` compares the discovered bundled body by hash, so an old conduct-less block becomes `behind` with no detector redesign.
- [x] Is a governing document required before planning? No approved repo document governs this seed yet; `docs_todo: true` records that debt while the MASTERPLAN supplies the explicit product direction.

## Parked (explicitly deferred)

- None.
