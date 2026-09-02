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

## Amendment — review budget and root-cause classes (2026-09-01)

Adopted by the operator on 2026-09-01 (recorded in HZN-008's group context) and
committed here by SKILL-039, after CORE-127 spent nine Review → Implementing
rounds on thirty-four findings that were variants of one parsing-authority
mechanism. It amends nothing above: the behaviour, acceptance criteria 1–5 and
edge cases stand, and this section makes acceptance criterion 5 executable by
naming what counts, what blocks, and what a reviewer does instead of patching
examples one at a time. It controls review, remediation, replanning and
operator escalation for every `/goal` run.

### 1. What counts as a remediation attempt

A remediation attempt is counted only when code or an authoritative contract is
changed in response to one or more blocking findings.

The following do not consume remediation budget:

- repeating an audit against the same unchanged PR head;
- re-reading the same board state;
- a reviewer restating an existing finding;
- an outdated GitHub thread;
- recording or updating a finding disposition;
- correcting PR metadata that does not change code;
- resolving a thread after its durable disposition;
- a new minor or note finding that does not invalidate acceptance.

Three audits of the same head and same finding count as one observed condition,
not three remediation failures.

### 2. Finding severity

Normalize findings to `blocker`, `major`, `minor` and `note`.

Map external P1 to blocker or major according to actual impact. Map external P2
to minor unless live evidence shows it invalidates the ticket's approved
acceptance, causes security or data loss, breaks a supported production path, or
prevents required verification.

An opaque internal finding id such as `F-016` never overrides the live finding's
source, text, current-head status and severity.

### 3. What blocks

Only these prevent merge:

- an open blocker;
- an open major;
- a failed required check;
- a review tied to an older head;
- an unmet approved acceptance criterion;
- an unresolved security, data-loss or destructive risk;
- a genuine owner-only product decision.

Minor and note findings do not block after they have one durable disposition:
`fixed`, `rejected-with-reason`, `accepted-risk`, `deferred-to-ticket` or
`obsolete-after-change`.

### 4. Outdated threads

A GitHub thread marked outdated cannot remain a blocker merely because it is
unresolved in GitHub.

Disposition it as `obsolete-after-change` unless a reviewer reasserts the same
defect against the current head with current evidence.

Preserve the historical thread; do not count it as an open current finding.

### 5. Consolidated review

The first independent reviewer performs one complete review and reports every
material finding it can identify.

After remediation, the same review cycle examines only the original findings,
changed lines, direct callers and contracts affected by those changes, relevant
tests, and any newly introduced blocker or major defect. It must not restart
unrestricted repository-wide ideation.

### 6. Root-cause classification

When two findings arise from the same underlying mechanism, stop patching
examples individually.

Record one root-cause class and choose one of:

- replace the underlying implementation approach;
- revise the plan;
- narrow the approved contract;
- defer the broader class to one follow-up ticket.

Examples include repeated TOML grammar variants against a hand-written parser,
repeated path-normalization aliases, repeated missing registrations caused by
duplicated composition rules, and repeated permission omissions caused by absent
migration enforcement.

Do not create one ticket per syntax example or edge case.

### 7. Budget exhaustion

Exhausting a remediation budget is not automatically an operator-only stop. When
the budget is exhausted, the controller must decide from current evidence:

- blocker or major still open: perform the one allowed replan, or mark the
  ticket blocked with exact evidence;
- only minor or note findings remain: disposition them automatically under
  standing goal authority and continue;
- finding is outside the approved outcome and safely deferable: create or reuse
  one non-blocking follow-up and continue;
- current implementation approach is the root cause: use the one controlled
  replan rather than another local patch;
- genuine product, security or destructive decision: ask the operator one
  consolidated question.

The operator is not asked merely to extend a numeric retry counter.

### 8. Follow-up rule

Create a follow-up ticket only when the work is outside the approved outcome,
independently valuable, safely deferable, a separate product decision, or
materially too large for the current unit of work.

All findings from one underlying deferred class belong in one follow-up ticket.

### 9. Terminal review decision

A PR may pass with residual minor risk when all approved acceptance checks pass,
required checks are green at the exact head, no blocker or major is open, every
minor and note has a durable disposition, residual risk is stated explicitly,
and any deferred class has one linked follow-up.

Zero review observations is not required.

### 10. Review-budget acceptance tests

Golden-board tests must prove:

- **A.** Three audits of one unchanged head and finding consume no additional
  remediation attempts.
- **B.** An exact-head PR with green checks and only dispositioned P2/minor
  findings passes.
- **C.** A new P1/major introduced by remediation blocks.
- **D.** An outdated unresolved GitHub thread does not block.
- **E.** Several findings from one parser or lifecycle root cause produce one
  replan or follow-up, not several patches or tickets.
- **F.** Budget exhaustion with only minor findings does not request operator
  authorization.
- **G.** Budget exhaustion with a genuine unresolved product or security
  decision does request the operator.

A–G are golden-board scenarios owned by **CORE-119**; SKILL-039 records them
here and does not claim them as passing.
