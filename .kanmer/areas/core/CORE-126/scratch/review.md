---
kind: review-attestation
pr: "306"
head_sha: "b51ead6e019f11d035c66f148c311a707f123bb0"
verdict: needs-changes
reviewer: "Codex subagent /root/core126_final_review"
independent: true
plan_hash: "38903744c2614884"
ticket_updated: "2026-08-31T12:58:26.263Z"
board_sha: "47d375a1989795fb3f9a6799f1df3335b7a7d2ae"
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
    summary: "Projected untaken-member workspaces bypassed physical Git validation."
    disposition: fixed
  - id: F-019
    severity: major
    summary: "A worktree-less declaration can freeze an immutable batch that no execution packet can use."
    disposition: open
  - id: F-020
    severity: minor
    summary: "Non-authoritative display labels can reject an otherwise authorized batch controller."
    disposition: open
  - id: F-021
    severity: major
    summary: "The auto batch lane omits the mandatory durable controller_run."
    disposition: open
  - id: F-022
    severity: major
    summary: "Shared review advances only one roster member after merge."
    disposition: open
  - id: F-023
    severity: major
    summary: "Later batch members are instructed to create a second PR instead of reusing the shared PR."
    disposition: open
---

# Independent exact-head delta review — CORE-126 / PR #306

## Verdict

Needs changes at exact head `b51ead6e019f11d035c66f148c311a707f123bb0`.

F-018 is fixed: the shared post-projection validator now refuses missing/moved, wrong-branch, foreign-repository, source/board, collision, and Git-common-directory mismatches before an untaken sibling can receive a ready packet or lease. Hosted authoritative `verify` is green at this exact head.

The settled automated review and independent delta review confirmed four merge-blocking majors, F-019/F-021/F-022/F-023, plus the bounded minor F-020. They are one end-to-end lifecycle invariant: a frozen batch must have a real shared worktree, retain actor/run authority through every packet and heartbeat, reuse exactly one PR for every member, and move the complete roster into per-member verification after the shared merge.

## Required bounded remediation

Apply the versioned plan's single root-cause replan:

- reject a worktree-less batch before WAL/ticket writes while preserving isolated branch-only take;
- let an exact manifest actor/run bypass only the generic display-owner check after all batch and physical safety checks;
- pass the automation run record's immutable `run_id` as `controller_run` on every batch operation;
- make later members validate, reuse, and record the one existing shared PR; and
- after confirmed merge, idempotently move every immutable roster member one Review-to-Verifying boundary.

No new tool, stage, service, migration, provider abstraction, release-roster item, or Infisical/credential work is authorized. The next review is strictly the F-019–F-023 delta and F-018 regression safety.
