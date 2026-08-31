---
kind: review-attestation
pr: "306"
head_sha: "738e03ee2179621c347328e704134b1202ea5a8e"
verdict: needs-changes
reviewer: "Codex subagent /root/core126_final_review"
independent: true
plan_hash: "ceafdb46ea6c825c"
ticket_updated: "2026-08-31T12:23:36.797Z"
board_sha: "7a1dfd57cbd2a422a86b2e2f0e7f41840f029fe5"
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
findings:
  - id: F-001
    severity: major
    summary: "Batch authority must distinguish concurrent controller runs."
    disposition: fixed
  - id: F-002
    severity: major
    summary: "Modern batch renewal must require exact lease CAS tokens."
    disposition: fixed
  - id: F-003
    severity: major
    summary: "Releasing roster evidence must remain discoverable through manifest unlink."
    disposition: fixed
  - id: F-004
    severity: minor
    summary: "Closeout/report prose overclaimed actor-bound terminal release."
    disposition: fixed
  - id: F-005
    severity: major
    summary: "Older stable servers could mutate candidate-created manifest-backed batches."
    disposition: rejected-with-reason
    reason: "Public v0.3.12 has no batch implementation, and the fixed stable/candidate boundary forbids candidate writes to the live board before promotion."
  - id: F-006
    severity: major
    summary: "Manifest worktree authority was host-absolute."
    disposition: fixed
  - id: F-007
    severity: major
    summary: "Exact-roster dependencies blocked the shared PR."
    disposition: fixed
  - id: F-008
    severity: major
    summary: "Invalid batch workspaces lacked structured lease-conflict evidence."
    disposition: fixed
  - id: F-009
    severity: major
    summary: "Plural review evidence could remain non-blocking in lenient mode."
    disposition: fixed
  - id: F-010
    severity: major
    summary: "Batch renewal persisted a noncanonical controller run."
    disposition: fixed
  - id: F-011
    severity: major
    summary: "A frozen roster could mix incompatible PR targets."
    disposition: fixed
  - id: F-012
    severity: major
    summary: "The batch gate did not bind the PR to the manifest branch."
    disposition: fixed
  - id: F-013
    severity: major
    summary: "Plural reviews were not bound to each member's current ticket and plan evidence."
    disposition: fixed
  - id: F-014
    severity: major
    summary: "Untaken frozen siblings lacked the immutable shared workspace in their packet."
    disposition: fixed
  - id: F-015
    severity: major
    summary: "The gate did not require each member to record the shared PR."
    disposition: fixed
  - id: F-016
    severity: major
    summary: "An untaken roster member could pass the protected batch gate."
    disposition: fixed
  - id: F-017
    severity: major
    summary: "The review requested migration of alleged public-v0.3.12 pre-manifest batches."
    disposition: rejected-with-reason
    reason: "Public v0.3.12 commit 7eed70e contains no lease_batch; the pre-manifest form existed only in a later unreleased candidate confined to copied or disposable boards."
  - id: F-018
    severity: major
    summary: "The new untaken-sibling packet projection bypasses physical worktree, branch, and Git-common-directory validation."
    disposition: open
---

# Independent delta review — CORE-126 / PR #306

## Verdict

Needs changes at exact head `738e03ee2179621c347328e704134b1202ea5a8e`.

F-013 through F-016 are fixed and F-017's rejection is supported by public-tag history. The automated exact-head review found F-018 in the changed F-014 path, and the fresh independent reviewer reproduced it on a disposable board: a nonexistent manifest worktree yielded a ready packet and successful sibling lease.

## Required bounded remediation

Reuse or refactor the existing execution-packet physical Git validator after manifest projection and actor/run authorization. Validate the effective projected branch/worktree before returning ready. Keep Git checks out of core. Cover missing/moved, wrong-branch, foreign-repository, board/source-checkout, and physical-alias refusal through the shared validator, and prove the untaken member remains untaken on refusal.

Hosted `verify` passed at this exact head. `kanmer-gate` is red only because this needs-changes record replaces the previously stale review; source remediation is still required.
