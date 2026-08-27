---
id: CORE-122
type: ticket
title: 'Read-only reconciliation inspector (reconcile_ticket) salvaged from PR #286'
status: done
area: core
assignee: claude-code
profile: feature
stageEntered:
  preparing: '2026-08-27T13:45:22.030Z'
  review: '2026-08-27T14:52:48.672Z'
  verifying: '2026-08-27T16:10:51.171Z'
  done: '2026-08-27T16:35:44.721Z'
taken_at: '2026-08-27T13:50:30.210Z'
branch: core-122-reconcile-inspector
worktree: .worktrees/core-122
labels:
  - reliable-autonomy
groups:
  - HZN-008
links: []
refs:
  - docs/functional/frd/FRD-028-rescue-and-reconciliation.md
commits:
  - 7f8414276ca86f582d8a41d55c4d2d0ac94b6d20
  - a8318ea631038dfd82e0dc7bbc1f4656f79361f9
prs:
  - '289'
archived: false
created: '2026-08-27T10:07:40.777Z'
updated: '2026-08-27T16:36:50.865Z'
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

- [x] Core matrix tests cover every finding code including closed-unmerged with red checks → MOVE_TO_IMPLEMENTING recommendation and merged Review with missing/dirty worktree → MOVE_TO_VERIFYING recommendation with warning.
- [x] A linked `.worktrees/<id>` worktree is classified `matches-claim`, not `foreign-repository`.
- [x] Dry-run never mutates the store; a stalled `gh` returns `unavailable` within the timeout.

## Outcome

- Shipped as planned: PR https://github.com/collisionengineers/kanmer/pull/289 squash-merged to `main` on 2026-08-27T16:10:40Z as `a8318ea631038dfd82e0dc7bbc1f4656f79361f9` (PR head `7f841427`). `reconcile_ticket` is registered read-only (38 tools); no `apply_reconciliation`.
- Review attestation `43e57a602c6a76cf`; proof `7781b1b90d3febf8` result PASS (independent verify at the merge SHA; host-quirk rail failures covered by hosted CI run 33084574539 on the identical tree).
- Accepted risk: review finding F-002 is accepted-risk and must be revisited before any apply/mutating reconciliation surface (`apply_reconciliation`) is introduced.
- No follow-up tickets created by closeout. Closed out 2026-08-27: worktrees `.worktrees/core-122` and the verify worktree removed; branch `core-122-reconcile-inspector` deleted locally and on origin.
