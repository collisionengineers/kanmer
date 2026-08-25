---
id: CORE-102
type: ticket
title: Stabilize the area-based ticket-ID test under the release verification rail
status: review
area: core
assignee: codex-mcp-client
profile: fix
stageEntered:
  preparing: '2026-08-25T00:11:20.854Z'
  review: '2026-08-25T00:32:42.821Z'
taken_at: '2026-08-25T00:21:47.982Z'
branch: core-102-stabilize-area-id-test
worktree: .worktrees/core-102
labels:
  - ci
  - tests
  - windows
  - release-verification
  - flaky
groups:
  - HZN-007
links:
  - CORE-101
blocks:
  - CORE-101
refs:
  - docs/functional/frd/FRD-015-ticket-and-board-core.md
commits:
  - 6bd74aaa900651e53378b96deb785721c841855b
prs:
  - '254'
archived: false
created: '2026-08-25T00:11:16.436Z'
updated: '2026-08-25T00:32:42.821Z'
---

## Trigger

The v0.3.7 tag workflow's authoritative verification rail failed after public release publication. In `packages/core/src/store.test.ts`, `KanmerStore > gives tickets area-based ids and places them in the area's folder` exceeded Vitest's 5000 ms timeout on GitHub Windows (`8185 ms`; 309 tests passed, one timed out). [[CORE-101]] remains Verifying; this ticket is the separate source-only remediation.

## Scope

Diagnose and remove the nondeterministic timeout without weakening assertions or globally masking failures. Preserve the test's behavioural claim: tickets use the area prefix and are persisted in the correct area folder. Add a focused regression demonstration if needed. Run the authoritative rail on the PR.

## Constraints

- Do not alter v0.3.4, v0.3.5, v0.3.6, or v0.3.7 releases/tags/assets/workflows.
- Do not rerun or repair the historical v0.3.7 tag workflow.
- No release/publish work and no unrelated source changes.
- A longer timeout alone is not a sufficient fix unless the diagnosis proves the assertion's underlying work is intrinsically long and stable.

## Exit condition

A normally merged remediation PR has terminal passing verification. Its merged-main proof records the relevant test and authoritative rail exit codes. Only then may [[CORE-101]] receive factual follow-up evidence; it is not automatically Done.
