---
kind: review-attestation
pr: "312"
head_sha: "444f96052803be32012b26f42e2462e6d82b7ca7"
verdict: needs-changes
reviewer: "skill039-independent-reviewer"
independent: true
plan_hash: "7458539227dcc22e"
ticket_updated: "2026-09-02T08:51:24.394Z"
board_sha: "d8b7cdc7f3cfc2ebb7865216c83a3f2a20a1de01"
expected_reviewers:
  - "skill039-independent-reviewer"
threads_snapshot:
  - source: github
    id: "PRRT_kwDOT2PEds6ebw9o"
    author: "chatgpt-codex-connector"
    resolved: false
    finding: F-001
  - source: github
    id: "PRRT_kwDOT2PEds6ebw9w"
    author: "chatgpt-codex-connector"
    resolved: false
    finding: F-002
  - source: github
    id: "PRRT_kwDOT2PEds6ebw96"
    author: "chatgpt-codex-connector"
    resolved: false
    finding: F-003
  - source: github
    id: "PRRT_kwDOT2PEds6ebw-F"
    author: "chatgpt-codex-connector"
    resolved: false
    finding: F-004
  - source: github
    id: "PRRT_kwDOT2PEds6ebw-K"
    author: "chatgpt-codex-connector"
    resolved: false
    finding: F-005
findings:
  - id: F-001
    severity: major
    summary: "Obsolete-after-change accepts a non-SHA reason and can hide a current blocker"
    disposition: open
  - id: F-002
    severity: major
    summary: "Reconciliation apply is instructed even when the dry run returns no recommendation"
    disposition: open
  - id: F-003
    severity: major
    summary: "The controller forbids the controlled exhausted-budget replan required by the amendment"
    disposition: open
  - id: F-004
    severity: major
    summary: "The executable review skill omits the amendment's external P1/P2 normalization"
    disposition: open
  - id: F-005
    severity: major
    summary: "Pass attestations can retain open minor or note findings despite the terminal-disposition rule"
    disposition: open
---
# Independent consolidated review — SKILL-039

Reviewed PR #312 at exact head `444f96052803be32012b26f42e2462e6d82b7ca7` against plan version `7458539227dcc22e`, ticket update `2026-09-02T08:51:24.394Z`, pushed board `d8b7cdc7f3cfc2ebb7865216c83a3f2a20a1de01`, the complete ticket packet, HZN-008 context, FRD-028, and FRD-034.

## Acceptance and checks

The implementation is within the planned 17-file surface and both hosted `verify` jobs are green. The required `kanmer-gate` is red because the review attestation was absent at those runs; this record supplies that evidence but cannot be a pass while the five current-head major findings remain open. PR merge state is BLOCKED and all five threads are unresolved.

## Findings and dispositions

- F-001 — open major at `packages/core/src/review-attestation.ts:76`. The parser enforces only non-empty text, not the documented `superseded by <full-sha>` evidence. Add exact-form validation and negative tests.
- F-002 — open major at `plugins/kanmer/skills/kanmer-verify/SKILL.md:20`, shared by verify/closeout/auto. Root-cause class: reconciliation without a recommendation. A normal null recommendation is valid evidence; apply only when one exists and pin that condition.
- F-003 — open major at `docs/functional/frd/FRD-034-durable-goal-control-and-independent-review.md:165`. Root-cause class: amendment not executable by the controller. Align `kanmer-auto` and its prose validator with the one controlled replan after budget exhaustion without adding another remediation round.
- F-004 — open major at `docs/functional/frd/FRD-034-durable-goal-control-and-independent-review.md:93`. Root-cause class: amendment not executable by the reviewer. Carry the P1/P2 normalization into `kanmer-review` and pin it.
- F-005 — open major at `docs/functional/frd/FRD-034-durable-goal-control-and-independent-review.md:112`. Root-cause class: terminal disposition not enforced. A pass must reject any open minor/note rather than treating it as already dispositioned.

Each mapping and remediation was posted publicly in its GitHub thread. Threads remain unresolved because the findings are open and require implementation.

## Residual risk

No additional actionable defects were found in the complete diff. Generated artifacts and documentation remain subject to the existing full verification rail after remediation.
