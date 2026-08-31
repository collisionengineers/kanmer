---
kind: review-attestation
pr: "307"
head_sha: "fbeab7630d6d287c90f1d59da596890ae507b0be"
verdict: needs-changes
reviewer: "Codex subagent /root/core127_formal_review"
independent: true
plan_hash: "68bbd208cb76bf88"
ticket_updated: "2026-08-31T19:55:04.505Z"
findings:
  - id: F-001
    severity: major
    summary: "Recursive glob matching can block the single MCP process with exponential backtracking."
    disposition: open
  - id: F-002
    severity: major
    summary: "Compilation emits constrained packets whose selected step has no checklist marker and can never reconcile PASS."
    disposition: open
  - id: F-003
    severity: major
    summary: "Checklist EOL normalization permits a CRLF-to-LF whole-document rewrite to reconcile PASS."
    disposition: open
  - id: F-004
    severity: minor
    summary: "Duplicate ticket group membership makes the producer sign a packet that its own verifier rejects."
    disposition: open
  - id: F-005
    severity: blocker
    summary: "A linked worktree physically nested beneath the dedicated board worktree bypasses protected-workspace checks."
    disposition: open
---

# Independent consolidated review — CORE-127 / PR #307

Reviewed exact base `4fda54b4489fa4bc4b6b091c2af67715245ffa08` through exact head `fbeab7630d6d287c90f1d59da596890ae507b0be`.

The 19 changed paths match the authorized files packet. The implementation worktree is clean and `git diff --check` passes. Hosted `verify` passed in run 33433072332, job 99622879161. The required `kanmer-gate` is red from its pre-attestation/pre-Review board snapshot, and all five exact-head review threads are open and non-outdated.

## Findings and remediation

### F-001 — major — open

Thread `PRRT_kwDOT2PEds6d2-fI`. Replace recursive revisiting in `planPathMatches` with bounded matching. Exhaustion must be inconclusive for both allowed and forbidden evaluation, never silently “no match.” Prove adversarial repeated-`**`, long-path/stack-depth, and classifier behavior.

### F-002 — major — open

Thread `PRRT_kwDOT2PEds6d2-fO`. Refuse compilation unless the selected step has at least one mapped unchecked checklist marker. Prove null, unrelated-only, and named-missing checklists refuse, while valid multi-marker steps remain usable.

### F-003 — major — open

Thread `PRRT_kwDOT2PEds6d2-fP`. Compare exact checklist line bytes and terminators, allowing only `[ ]` to `[x]` or `[X]` on mapped lines. Prove CRLF preservation passes and CRLF/LF, CR/LF, mixed-EOL, and final-newline changes fail.

### F-004 — minor — open

Thread `PRRT_kwDOT2PEds6d2-fS`. Deduplicate identical group membership during collection or refuse it before signing; reject conflicting duplicate evidence. Assert every emitted packet passes its verifier.

### F-005 — blocker — open

Thread `PRRT_kwDOT2PEds6d2-fU`. In both whole-ticket resume safety and snapshot collection, reject every physical descendant of a dedicated board worktree regardless of the candidate Git top-level. Preserve the legacy shared-root case. Prove the bypass with a real nested linked-worktree fixture.

## Decision

The blocker and major findings prevent PASS. Return the same PR and recorded workspace for one bounded consolidated remediation batch. The delta review must bind to the resulting exact new head and cover these findings, changed lines, affected callers/contracts, and relevant tests.
