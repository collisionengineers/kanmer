---
kind: proof-record
merged_sha: "c1bc3be8532150832328a6d7f62ecd94cdcf6220"
environment: "Detached Windows worktree C:\\Users\\Alex\\Documents\\GitHub\\kanmer\\.worktrees\\verify-core-132-c1bc3be8; Microsoft Windows NT 10.0.26200.0; Node v24.15.0; npm 11.14.1"
verified_at: "2026-08-31T07:10:54.1702602Z"
result: PASS
attempts:
  - attempted_at: "2026-08-31T07:00:58Z"
    command: "npm ci"
    cwd: ".worktrees/verify-core-132-c1bc3be8"
    exit_code: 0
    result: PASS
    summary: "Installed 647 packages from the lockfile in the clean detached checkout."
  - attempted_at: "2026-08-31T07:01:15Z"
    command: "npm run verify"
    cwd: ".worktrees/verify-core-132-c1bc3be8"
    exit_code: 0
    result: PASS
    summary: "First and only exact-merge authoritative rail: core 663/663, GUI 524/524, MCP 170/170, scripts 155/155, smoke 349/349, protocol 50/50, discovery 13/13, AGENTS 31/31; build, typecheck, docs, headless, MCPB, skills and plugin byte identity also passed."
---

# Verification proof — CORE-132

## Immutable merge identity

- PR: https://github.com/collisionengineers/kanmer/pull/303
- GitHub merged at: `2026-08-31T07:00:31Z`.
- Independently reviewed PR head: `e2a36b856cbb67b7dcbd2cbcee05a3f3874e40d9`.
- Exact GitHub squash-merge SHA: `c1bc3be8532150832328a6d7f62ecd94cdcf6220`.
- Exact merge parent: `69796f35f84aab897075713672a3b28988f126b8`.
- Verification checkout was detached, tracked-clean, and exactly at the merge SHA before and after the rail.

## Exact-merge results

The complete authoritative Windows rail passed on its first attempt. No unchanged rerun or overlapping local rail was used.

- Core: 24 files, 663/663, including release 94/94 and delivery 55/55.
- GUI: 54 files, 524/524.
- MCP HTTP/release/reconciliation: 170/170, including focused release and reconciliation 49/49.
- Script suites: 155/155.
- MCP smoke: 349/349.
- Protocol compatibility: 50/50.
- Discovery: 13/13.
- Canonical AGENTS block: 31/31.
- Build, typecheck, docs mirror, headless bundle, MCPB, skill prose, generated manual, and plugin byte synchronization: PASS.

Hosted push-to-main verification independently passed at the same exact merge SHA in workflow `33366498207`, verify job `99408128452`.

## Acceptance evidence

- Unreadable or malformed ownership fails closed; only ENOENT is absence.
- Recoverable transaction epochs, exact journals, all-CAS preflight, and durable heads cover candidate creation and supersession interruption windows.
- Progress renews expiry, failed terminal attempts remain immutable, and all write authorization binds to the actual actor and current lease CAS.
- Exact record schemas, case/device channel validation, concrete refs, complete ordinal history, causal successor traversal, retry freeze, and policy-version binding are enforced.
- Reconnected status retains current and terminal evidence; reconciliation binds to a coherent release epoch.
- The carried hotfix verification-target defect uses the recorded delivery target and re-reads after elicitation.
- Automated Codex settled clean at the exact reviewed head; fresh independent review passed with zero blocker/major findings.
- All 30 historical findings were publicly dispositioned fixed and their GitHub conversations resolved before merge.
- Pre-merge exact-head `verify` and `kanmer-gate` passed; final board-regate used synced board `2c40960460a5337be3e5a6d3de309f87c5812ac8`.

## Residual risk

One non-blocking test-granularity risk is accepted: the dispatch freshness regression proves post-elicitation source ordering rather than simulating a protocol-level concurrent mutation. Production reread and behavioral delivery-target coverage prove the acceptance behavior.

## Result

PASS. The exact shipped merge satisfies CORE-132 and may move from Verifying to Done.
