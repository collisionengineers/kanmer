---
kind: review-attestation
pr: "141"
head_sha: "df56503baafe3ef5a2e3fa78e2d9d3376495af12"
verdict: needs-changes
reviewer: "codex-mcp-client"
independent: true
plan_hash: "8adae9d99ba79f7d"
ticket_updated: "2026-08-21T23:28:16.705Z"
findings:
  - id: F-001
    severity: blocker
    summary: "Required GitHub verify check is red on the pre-existing Windows runner path-alias assertion."
    disposition: deferred-to-ticket
    ticket: "CORE-032"
---

# Independent review — SKILL-021

## Scope and changes

PR #141 (df56503baafe3ef5a2e3fa78e2d9d3376495af12) changes exactly the three packet/SHA phase skills named by the ticket:

- kanmer-execute: packet-first refusal, capability-gated project token, exact worktree/take choreography, version-aware writes, bounded stop condition, and no self-merge/next-ticket rule.
- kanmer-review: current-head/plan/ticket binding, GitHub checks/comments/thread gathering, versioned whole-file attestation, dispositions, stale-evidence rejection, and authorized one-stage merge.
- kanmer-verify: merged-mergeCommit refusal, detached exact-SHA worktree, retained attempts, whole-file proof, PASS-only Done, and no-main mutation.

No MCP/core/GUI/tool-reference/schema/profile/old-review-asset changes are present.

## Independent checks

- npm run verify:skills from the ticket worktree — PASS.
- Positive packet/compatibility/head/status-check/whole-file/mergeCommit/detached/PASS contract searches — PASS.
- Legacy unsafe-text negative search over all three skills — PASS, zero matches.
- git diff --check — PASS.
- The author's first fresh-worktree npm run test:scripts failure due missing packages/core/dist/index.js, followed by npm run build:core and 80/80 passing rerun, is preserved in the report.

## Blocking finding and disposition

GitHub Actions verify is required and remains FAIL: 351/352 GUI tests pass, with the sole failure in the pre-existing src/main/kanmerGit.test.ts Windows path-alias assertion (expected C:\Users\RUNNER~1\..., received C:\Users\runneradmin\...). A rerun reproduced the same failure. CORE-032 already tracks this environment-specific test defect; this review links SKILL-021 to CORE-032 and defers the blocker there.

Because a required check is red, the review verdict is needs-changes; PR #141 must not be merged and SKILL-021 remains in Review. This is not a defect in the three skill files, but it is a merge-blocking repository condition under the packet's review contract.

## CI update — 2026-08-22
The shared GitHub verify rail remains red on the unrelated MCP tunnel supervisor test (60/61; expected retry starts 2, observed 1), repeated across two attempts. MCP-041 tracks the separate remediation; this ticket remains held and no scope is absorbed.
