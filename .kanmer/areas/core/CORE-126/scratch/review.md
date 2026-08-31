---
kind: review-attestation
pr: "306"
head_sha: "31dac12a8d6445de0c775e47bf709499830a5c4e"
verdict: needs-changes
reviewer: "Codex subagent /root/core126_final_review"
independent: true
plan_hash: "ba95bd91f8924e4a"
ticket_updated: "2026-08-31T14:03:15.276Z"
board_sha: "b4c109092e561ddd3e06f03dc05cf9e85851c8fc"
expected_reviewers:
  - "GitHub Codex automated review"
  - "Codex subagent /root/core126_final_review"
threads_snapshot:
  - { source: github, id: "PRRT_kwDOT2PEds6dqX9y", finding: F-003, resolved: false }
  - { source: github, id: "PRRT_kwDOT2PEds6dqX94", finding: F-001, resolved: false }
  - { source: github, id: "PRRT_kwDOT2PEds6dqX9-", finding: F-002, resolved: false }
  - { source: github, id: "PRRT_kwDOT2PEds6drk17", finding: F-005, resolved: false }
  - { source: github, id: "PRRT_kwDOT2PEds6drk2A", finding: F-006, resolved: false }
  - { source: github, id: "PRRT_kwDOT2PEds6drk2D", finding: F-007, resolved: false }
  - { source: github, id: "PRRT_kwDOT2PEds6dseFN", finding: F-008, resolved: false }
  - { source: github, id: "PRRT_kwDOT2PEds6dseFQ", finding: F-009, resolved: false }
  - { source: github, id: "PRRT_kwDOT2PEds6dseFT", finding: F-010, resolved: false }
  - { source: github, id: "PRRT_kwDOT2PEds6dseFW", finding: F-011, resolved: false }
  - { source: github, id: "PRRT_kwDOT2PEds6dseFX", finding: F-012, resolved: false }
  - { source: github, id: "PRRT_kwDOT2PEds6dtMzL", finding: F-013, resolved: false }
  - { source: github, id: "PRRT_kwDOT2PEds6dtMzS", finding: F-014, resolved: false }
  - { source: github, id: "PRRT_kwDOT2PEds6dtMza", finding: F-015, resolved: false }
  - { source: github, id: "PRRT_kwDOT2PEds6dtMzg", finding: F-016, resolved: false }
  - { source: github, id: "PRRT_kwDOT2PEds6dtMzm", finding: F-017, resolved: false }
  - { source: github, id: "PRRT_kwDOT2PEds6duEUg", finding: F-018, resolved: false }
  - { source: github, id: "PRRT_kwDOT2PEds6du2gm", finding: F-019, resolved: false }
  - { source: github, id: "PRRT_kwDOT2PEds6du2gs", finding: F-020, resolved: false }
  - { source: github, id: "PRRT_kwDOT2PEds6du2g0", finding: F-021, resolved: false }
  - { source: github, id: "PRRT_kwDOT2PEds6du2g5", finding: F-022, resolved: false }
  - { source: github, id: "PRRT_kwDOT2PEds6du2g_", finding: F-023, resolved: false }
  - { source: github, id: "PRRT_kwDOT2PEds6dwRez", finding: F-024, resolved: false }
  - { source: github, id: "PRRT_kwDOT2PEds6dwRe6", finding: F-025, resolved: false }
findings:
  - { id: F-001, severity: major, summary: "Concurrent controller runs need distinct batch authority.", disposition: fixed }
  - { id: F-002, severity: major, summary: "Modern batch renewal needs exact lease CAS tokens.", disposition: fixed }
  - { id: F-003, severity: major, summary: "Releasing roster evidence must remain discoverable through manifest unlink.", disposition: fixed }
  - { id: F-004, severity: minor, summary: "Closeout prose overclaimed actor-bound terminal release.", disposition: fixed }
  - id: F-005
    severity: major
    summary: "Older stable servers could mutate candidate-created manifest-backed batches."
    disposition: rejected-with-reason
    reason: "Public v0.3.12 has no batch implementation, and stable/candidate isolation forbids candidate writes to the live board before promotion."
  - { id: F-006, severity: major, summary: "Manifest worktree authority was host-absolute.", disposition: fixed }
  - { id: F-007, severity: major, summary: "Exact-roster dependencies blocked the shared PR.", disposition: fixed }
  - { id: F-008, severity: major, summary: "Invalid batch workspaces lacked structured lease-conflict evidence.", disposition: fixed }
  - { id: F-009, severity: major, summary: "Plural review evidence could remain non-blocking in lenient mode.", disposition: fixed }
  - { id: F-010, severity: major, summary: "Batch renewal persisted a noncanonical controller run.", disposition: fixed }
  - { id: F-011, severity: major, summary: "A frozen roster could mix incompatible PR targets.", disposition: fixed }
  - { id: F-012, severity: major, summary: "The batch gate did not bind the PR to the manifest branch.", disposition: fixed }
  - { id: F-013, severity: major, summary: "Plural reviews were not bound to each member current ticket and plan evidence.", disposition: fixed }
  - { id: F-014, severity: major, summary: "Untaken frozen siblings lacked the immutable shared workspace in their packet.", disposition: fixed }
  - { id: F-015, severity: major, summary: "The gate did not require each member to record the shared PR.", disposition: fixed }
  - { id: F-016, severity: major, summary: "An untaken roster member could pass the protected batch gate.", disposition: fixed }
  - id: F-017
    severity: major
    summary: "The review requested migration of alleged public-v0.3.12 pre-manifest batches."
    disposition: rejected-with-reason
    reason: "Public v0.3.12 contains no lease_batch; the pre-manifest form existed only in an unreleased candidate confined to disposable boards."
  - { id: F-018, severity: major, summary: "Projected untaken-member workspaces bypassed physical Git validation.", disposition: fixed }
  - { id: F-019, severity: major, summary: "A worktree-less declaration could freeze an unusable immutable batch.", disposition: fixed }
  - { id: F-020, severity: minor, summary: "Display labels could reject an otherwise authorized batch controller.", disposition: fixed }
  - { id: F-021, severity: major, summary: "The auto batch lane omitted the mandatory durable controller run.", disposition: fixed }
  - { id: F-022, severity: major, summary: "Shared review advanced only one roster member after merge.", disposition: fixed }
  - { id: F-023, severity: major, summary: "Later batch members were instructed to create a second PR.", disposition: fixed }
  - { id: F-024, severity: major, summary: "A plural PR against the wrong configured base can pass when strict mode is unset.", disposition: open }
  - { id: F-025, severity: major, summary: "A plural PR from a missing or foreign head repository can pass provenance checks.", disposition: open }
---

# Independent exact-head delta review — CORE-126 / PR #306

## Verdict

Needs changes at exact head 31dac12a8d6445de0c775e47bf709499830a5c4e.

Hosted verify passed on that exact head. F-019 through F-023 are fixed, F-018 remains regression-safe, and the affected F-001 through F-017 paths show no regression. The exact-head automated review and fresh independent reviewer agree that F-024 and F-025 are valid majors.

## Required bounded remediation

For phase-2 plural batches only, fail closed in strict and lenient modes unless the PR base is present and equals the one resolved delivery target, and unless the base/source and head repositories are present and case-normalize to the same GitHub repository. Preserve singular target warnings, singular fork compatibility, and the legacy emitted PR JSON shape.

The implementation and tests are confined to merge-gate.ts, merge-gate.test.ts, check-pr.mjs, and check-pr.test.mjs, already authorized by the versioned files document. No prose, AGENTS, manual, bundle, dependency, board-schema, credential, or unrelated work is authorized.
