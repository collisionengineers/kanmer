---
kind: review-attestation
pr: "306"
head_sha: "13938b440b37a67ddc27373138e14dd6a4daa395"
verdict: needs-changes
reviewer: "Codex subagent /root/core126_independent_review"
independent: true
plan_hash: "e7b4c6fd9634ea03"
ticket_updated: "2026-08-31T08:44:05.117Z"
board_sha: "d44b218d1e4e87fc92f88efdc7e2ddebc6cb760c"
expected_reviewers:
  - "Codex subagent /root/core126_independent_review"
threads_snapshot:
  - source: github
    id: "PRRT_kwDOT2PEds6dqX94"
    author: "chatgpt-codex-connector"
    path: "packages/mcp-server/src/index.ts"
    line: 1831
    finding: F-001
    resolved: false
  - source: github
    id: "PRRT_kwDOT2PEds6dqX9-"
    author: "chatgpt-codex-connector"
    path: "packages/core/src/store.ts"
    line: 2818
    finding: F-002
    resolved: false
  - source: github
    id: "PRRT_kwDOT2PEds6dqX9y"
    author: "chatgpt-codex-connector"
    path: "packages/mcp-server/src/index.ts"
    line: 415
    finding: F-003
    resolved: false
findings:
  - id: F-001
    severity: major
    summary: "Batch authority aliases concurrent controller sessions because the active manifest retains only the MCP client product name and discards the durable controller run."
    disposition: open
  - id: F-002
    severity: major
    summary: "A modern manifest-backed batch renewal can omit both lease CAS tokens and still increment the lease revision."
    disposition: open
  - id: F-003
    severity: major
    summary: "A stop after the final member projection is cleared but before manifest unlink hides the releasing roster and shared Git path from list_items."
    disposition: open
  - id: F-004
    severity: minor
    summary: "The post-implementation report overclaims that terminal release is actor-bound; the implementation intentionally allows a fresh closeout agent to release after all members are terminal."
    disposition: open
---

# Independent consolidated review — CORE-126 / PR #306

## Verdict

Needs changes at exact head `13938b440b37a67ddc27373138e14dd6a4daa395`.

The fresh independent review and the settled automated review agree on the same three major defects. There are no additional blocker or major findings. Hosted `verify` and `kanmer-gate` are green on this head, but checks do not override the open exact-head correctness findings.

## Required remediation batch

1. Require, persist and exact-match a nonempty durable `controller_run` together with the actual MCP actor for declaration/recovery, member take, batch renew and batch execution packets. This is the documented cooperative file-board boundary; no cryptographic capability or provider framework is required.
2. Require both `lease_id` and `lease_revision` for every nonlegacy manifest-backed batch renewal, preserving the no-token compatibility lane only for isolated legacy claims.
3. Project active/releasing manifest evidence into item summaries until manifest unlink, including state, complete roster, workspace and branch, so a fresh closeout can recover the final-clear interruption.
4. Correct the report's terminal-release overclaim.

## Evidence and scope

The reviewer inspected the exact PR head, plan version, ticket timestamp, current board tip, complete diff, authoritative FRD, focused claims/merge-gate tests, hosted checks and every exact-head thread. Focused read-only checks passed: 94/94 claims plus merge-gate tests, 9/9 check-pr tests and `git diff --check`.

The remediation stays on the same branch, worktree and PR. It adds no dependency, tool, stage, board migration, provider abstraction, handwritten GUI work or unrelated backlog.
