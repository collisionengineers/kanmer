---
kind: review-attestation
pr: "307"
head_sha: "fc242c3c8fc8c97d2fbb7c9948af3f7d537c4de7"
verdict: needs-changes
reviewer: "Codex subagent /root/core127_delta_consolidation"
independent: true
plan_hash: "68bbd208cb76bf88"
ticket_updated: "2026-08-31T20:57:22.845Z"
findings:
  - id: F-001
    severity: major
    summary: "Recursive glob matching could block the MCP process with exponential revisiting."
    disposition: fixed
  - id: F-002
    severity: major
    summary: "A selected constrained step could lack a checklist marker and never reconcile PASS."
    disposition: fixed
  - id: F-003
    severity: major
    summary: "Checklist newline normalization could accept a whole-document EOL rewrite."
    disposition: fixed
  - id: F-004
    severity: minor
    summary: "Duplicate group evidence could make an emitted packet fail its own verifier."
    disposition: fixed
  - id: F-005
    severity: blocker
    summary: "A linked worktree beneath the dedicated board could bypass protected-workspace checks."
    disposition: fixed
  - id: F-006
    severity: major
    summary: "Unique group references are resolved with unbounded filesystem reads before the packet budget is checked."
    disposition: open
  - id: F-007
    severity: major
    summary: "Literal path parsing and equality bypass the aggregate matcher work budget."
    disposition: open
  - id: F-008
    severity: major
    summary: "Workspace file validation and reading are not bound to one filesystem object."
    disposition: open
  - id: F-009
    severity: major
    summary: "Assume-unchanged or skip-worktree index flags can hide tracked edits from porcelain status."
    disposition: open
---

# Independent exact-head consolidation — CORE-127 / PR #307

Reviewed exact base `4fda54b4489fa4bc4b6b091c2af67715245ffa08` through exact head `fc242c3c8fc8c97d2fbb7c9948af3f7d537c4de7` after the expected automated review settled.

The 19 changed paths remain within the authorized files packet. The worktree is clean. Hosted `verify` passed in run 33438698598, job 99641326109. The clean local Windows `npm run verify` also passed at this exact head from 2026-08-31T20:58:44.5293965Z through 2026-08-31T21:10:01.7598092Z. The current `kanmer-gate` failure is the known stale stage/old-head attestation snapshot, not a source-test failure.

## Prior findings — fixed

- F-001 / `PRRT_kwDOT2PEds6d2-fI`: iterative bounded matching replaces recursion and exhaustion propagates as INCONCLUSIVE.
- F-002 / `PRRT_kwDOT2PEds6d2-fO`: compilation and strict verification require a mapped unchecked checklist marker.
- F-003 / `PRRT_kwDOT2PEds6d2-fP`: raw line bodies and CRLF/CR/LF/final-newline state are compared exactly.
- F-004 / `PRRT_kwDOT2PEds6d2-fS`: exact duplicate evidence is canonicalized, conflicts refuse, and emitted packets self-verify.
- F-005 / `PRRT_kwDOT2PEds6d2-fU`: both packet paths reject a real linked worktree beneath a dedicated board while retaining the legacy colocated layout.

## Exact-head findings — open

### F-006 — major

Thread `PRRT_kwDOT2PEds6d4PLS`. Build and bound one canonical unique-group census before any `getGroup` or `getGroupDoc` call, then use it in both group-resolution paths. Prove the limit, limit plus one with zero context reads, and duplicate canonicalization.

### F-007 — major

Thread `PRRT_kwDOT2PEds6d4PLb`. Charge parsing, top-level literal equality and segment comparisons to the shared matcher budget before doing their work. Exhaustion across a literal Cartesian product must emit `STEP_PATH_MATCH_INCONCLUSIVE`, never authorize or mislabel the path as undeclared.

### F-008 — major

Thread `PRRT_kwDOT2PEds6d4PLk`. Open one file handle, bind pre/handle/post identity and mode, cap the read itself, and postvalidate size and identity. Deterministic replacement and growth races must be INCONCLUSIVE.

### F-009 — major

Thread `PRRT_kwDOT2PEds6d4PLs`. Add a bounded index-flag census and refuse assume-unchanged plus skip-worktree entries before accepting a workspace snapshot. Prove flags present before issuance and flag drift between samples.

## Decision

The four new major findings are valid and block merge. They share the root invariant that authority evidence must be bounded and race-safe before it can authorize a step. Return the same PR and recorded workspace to Implementing for one root-cause replan covering all four. Do not create follow-up tickets or widen the architecture. After source changes, require fresh exact-head automated settlement, one bounded independent delta review, a clean Windows rail, hosted `verify`, and a board-synced `kanmer-gate`.
