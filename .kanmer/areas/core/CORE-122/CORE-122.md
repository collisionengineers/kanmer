---
id: CORE-122
type: ticket
title: 'Read-only reconciliation inspector (reconcile_ticket) salvaged from PR #286'
status: backlog
area: core
assignee: ''
profile: feature
labels:
  - reliable-autonomy
groups:
  - HZN-008
links: []
refs:
  - docs/functional/frd/FRD-028-rescue-and-reconciliation.md
archived: false
created: '2026-08-27T10:07:40.777Z'
updated: '2026-08-27T10:07:40.777Z'
---

## What

Land the read-only half of FRD-028: a `reconcile_ticket` MCP tool that collects bounded board/Git/GitHub/CI/workspace facts and returns typed findings plus an advisory recommendation. No `apply_reconciliation`, no board mutation.

## Why

PR #286 (CORE-113, branch `core-113-rescue-reconciliation`, head `db63fb4b`) contains a sound classifier, collector, reachability helper and tests, but its mutating half depends on revision and lease contracts that do not exist yet. The inspector is safe now and is needed by the interim recovery procedure.

## Approach

- Reuse from PR #286: `packages/core/src/reconciliation.ts` classifier, `types.ts` evidence/finding types and `hasLegacyTicketClaim`, `packages/mcp-server/src/reconciliation.ts` collector, `git-reachability.mjs::collectCommitReachabilityFromTarget`, both test files, smoke assertions for `reconcile_ticket` (38 tools).
- Fix before landing: evaluate closed-unmerged and merged-Review routes before the required-checks and missing-worktree early returns (keep the warnings); compare worktree identity via `--git-common-dir` (reuse `execution-packet.ts` resolution) instead of `--show-toplevel`; add `timeout`/`maxBuffer` to every `gh`/`git` invocation; report claim state as `current | expired | unclaimed` using the bootstrap ownership fields when present.
- Drop `ReconciliationProposal`/`ReconciliationAction` from the public API; rename `proposal` → `recommendation` and mark advisory.

## Verification

- [ ] Core matrix tests cover every finding code including closed-unmerged with red checks → MOVE_TO_IMPLEMENTING recommendation and merged Review with missing/dirty worktree → MOVE_TO_VERIFYING recommendation with warning.
- [ ] A linked `.worktrees/<id>` worktree is classified `matches-claim`, not `foreign-repository`.
- [ ] Dry-run never mutates the store; a stalled `gh` returns `unavailable` within the timeout.

## Outcome
