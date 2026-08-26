---
status: draft
---

# FRD-034 — Durable goal control and independent review

**Implements:** PRD-002 requirement 7.

## Behaviour

A goal controller accepts one ticket, group, area, explicit ticket list or a
prepared board. It creates or resumes a durable run that records project,
authority, fixed initial roster and retry budget. New unrelated tickets and
captures do not join a running roster. Before dispatch and after every worker
result, the controller reconciles board, Git, GitHub, CI, claims, workspaces,
PRs and proofs; worker prose never advances a ticket on its own.

The controller orders dependencies, detects overlap, assigns bounded lanes,
acquires leases, dispatches bounded roles, persists each decision and continues
safe independent work while another lane waits. It completes only when every
roster member has a terminal disposition.

Review is performed by a fresh run distinct from the implementation run and is
bound to the exact current PR head. One consolidated review reports structured
findings. One in-scope remediation batch is followed by a delta review limited
to original findings, changed lines, direct callers/contracts and relevant tests.
Only blocker/major findings, failed required checks, stale review, unmet
acceptance or unresolved security/data-loss/destructive risk block merge.
Dispositioned minor/note findings may remain as explicit residual risk.

After merge, a fresh verifier validates the configured target's exact merged SHA.
Verification routes transient failures, flake retries, implementation defects,
plan defects, stale review and unavailable services to defined bounded outcomes;
PASS moves to Done and closeout cleans terminal resources.

## Acceptance criteria

1. A prepared fixture scope freezes its roster, uses leases and reaches a
   terminal disposition for every member without selecting unrelated captures.
2. Review attestations prove implementation-run identity differs from reviewer
   identity and bind the verdict/findings to the exact PR head.
3. An in-scope correction stays in the original ticket/PR and receives one
   delta review rather than an unrestricted new audit.
4. Exact merged-SHA verification records PASS proof before Done, and routes
   implementation/plan failures back to the correct earlier phase.
5. Review and verification budgets stop repeated unchanged audits while
   preserving durable minor/note dispositions and residual risk.

## Edge cases

- A merged PR left in Review and a PASS proof left in Verifying are reconciled
  before the controller reports success.
- A genuine owner-only product or security decision becomes one exact question,
  not a request to extend a retry counter.
