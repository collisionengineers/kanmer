---
kind: review-attestation
pr: "286"
head_sha: "db63fb4b150e956dafb88c75c99ff3088a0b72cc"
verdict: needs-changes
reviewer: "codex-core113-final-delta-reviewer"
independent: true
plan_hash: "b714f441cabfbc41"
ticket_updated: "2026-08-26T23:11:36.002Z"
findings:
  - id: F-001
    severity: major
    summary: "Original no-merge-SHA classifier defect is fixed."
    disposition: fixed
  - id: F-002
    severity: major
    summary: "GH-3867199103: complete proof metadata is now required before PASS evidence."
    disposition: fixed
  - id: F-003
    severity: major
    summary: "GH-3867199107: required checks are collected only with gh pr checks --required."
    disposition: fixed
  - id: F-004
    severity: major
    summary: "GH-3867199111: recorded commits are tested against the exact merge target."
    disposition: fixed
  - id: F-005
    severity: minor
    summary: "GH-3867199117: active recorded PR selection replaces first-reference selection."
    disposition: fixed
  - id: F-006
    severity: minor
    summary: "GH-3867199126: proposal and apply share the legacy-claim predicate."
    disposition: fixed
  - id: F-007
    severity: major
    summary: "GH-3867199132: same-repository URL identity is preserved and cross-repository refs fail closed."
    disposition: fixed
  - id: F-008
    severity: minor
    summary: "GH-3867199139: only ENOENT is missing; other stat failures are unavailable."
    disposition: fixed
  - id: F-009
    severity: major
    summary: "GH-3867199147: terminal release requires source-repository and branch identity plus clean state."
    disposition: fixed
  - id: F-010
    severity: minor
    summary: "GH-3867199159: both reconciliation operations now advertise open-world access."
    disposition: fixed
  - id: F-011
    severity: minor
    summary: "GH-3867199170: terminal controller release is separately recorded in audit activity."
    disposition: fixed
  - id: F-012
    severity: major
    summary: "GH-3867199182: dirty workspace is preserved while merged Review can advance to Verifying."
    disposition: fixed
  - id: F-013
    severity: major
    summary: "GH-3867199191: uncollected release evidence is represented as not-applicable, not fabricated none."
    disposition: fixed
  - id: F-014
    severity: minor
    summary: "GH-3867199202: reconciliation tests are included in the normal MCP HTTP test rail."
    disposition: fixed
  - id: F-015
    severity: major
    summary: "GH-3867261017: proof content can change after collector recollection and before the ticket mutation because proof writes do not participate in ticket CAS."
    disposition: open
  - id: F-016
    severity: minor
    summary: "GH-3867261023: failing or pending required checks preempt the closed-unmerged Review rollback."
    disposition: open
  - id: F-017
    severity: blocker
    summary: "CI-002: exact-head kanmer-gate run 33022278471 fails because remote kanmer-board still reports CORE-113 Backlog, DOC-027 blocked, and no review record."
    disposition: open
---

## Independent bounded final delta review

A fresh independent reviewer assessed only PR #286 at `db63fb4b150e956dafb88c75c99ff3088a0b72cc`, the controlled post-delta plan, FRD-028, current non-outdated GitHub findings, direct callers/contracts, and relevant tests. The reviewer made no source, board, PR, thread, branch, or merge mutation.

F-001 through F-014 map to the prior remediation findings in order above. The original GitHub threads GH-3867199103 through GH-3867199202 are now fixed by the reviewed head; all except GH-3867199202 are GitHub-outdated because the relevant source changed. The final head also rendered GH-3867261027 and GH-3867261032 outdated; they were not revived as current findings.

Focused independent evidence: `node --test packages/mcp-server/src/reconciliation.test.mjs` passed 6/6 and `npm test -w @kanmer/core -- reconciliation` passed 27/27.

## Residual risk and terminal result

F-015 / GH-3867261017 is a material current safety defect: between evidence recollection and the store mutation, an independent proof write can replace PASS with FAIL without changing `ticket.updated`; the current proposal fingerprint and ticket CAS can still match, allowing an invalid move to Done. This violates the reconciliation safety boundary and has no focused regression test.

F-016 / GH-3867261023 remains a minor recovery-route defect: failing or pending required checks block a closed-unmerged Review rollback before it can return the ticket to Implementing.

Exact-head workflow run 33022278471 now proves required CI is non-passing: kanmer-gate reports the remote board has CORE-113 in Backlog instead of Review, retains DOC-027 as a live blocker, and has no scratch/review attestation. This reflects an unsynchronised protected board branch; local MCP records are current but agents must not commit or push that branch. The exact-head verify jobs in runs 33022209622 and 33022222769 both passed; their kanmer-gate jobs failed on that unsynchronised remote-board evidence. Neither result removes F-015.

Under CORE-113's one-replan stop condition, F-015 is terminal for the automatic remediation budget. Do not merge, start CORE-114, or make another CORE-113 code-remediation commit without a new operator decision.
