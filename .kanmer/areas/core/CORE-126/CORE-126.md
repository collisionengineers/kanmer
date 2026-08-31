---
id: CORE-126
type: ticket
title: >-
  Batch workspaces follow-up: merge gate accepts a batch roster, closeout roster
  discovery, batch hardening (CORE-124 review)
status: review
area: core
assignee: codex-release-controller
profile: fix
stageEntered:
  preparing: '2026-08-31T07:15:00.575Z'
  review: '2026-08-31T08:44:05.117Z'
  implementing: '2026-08-31T09:17:30.533Z'
taken_at: '2026-08-31T07:26:39.097Z'
branch: core-126-batch-merge-path
worktree: .worktrees/core-126
labels:
  - reliable-autonomy
groups:
  - HZN-008
links:
  - CORE-124
  - CORE-125
refs:
  - docs/functional/frd/FRD-030-renewable-workspace-leases-and-batches.md
commits:
  - 13938b440b37a67ddc27373138e14dd6a4daa395
  - 405a65c2736001de4adfa97f5b4a999f57348054
prs:
  - '306'
archived: false
created: '2026-08-27T21:17:27.817Z'
updated: '2026-08-31T09:54:08.083Z'
---

## What

Findings deferred from the independent review of [[CORE-124]] (PR #295, head 14cf7083), raised by Codex threads and confirmed by the reviewer:

1. **Merge gate vs batch PR footer (major).** `kanmer-execute` batch-lane prose says a batch PR carries one `Kanmer: <ID>` line per member, but `packages/core/src/merge-gate.ts:144-146` returns "multiple distinct Kanmer footers are ambiguous" → `NO_TICKET`, so the prescribed batch PR cannot pass the required `kanmer-gate`. Teach `resolveMergeGateTicket`/`evaluateMergeGate` to validate a complete batch roster (every member in Review, each attestation bound to the same head), or change the skill/tool-reference contract to a compatible single-reference form.
2. **Closeout roster discovery (minor).** `kanmer-closeout` says to read members off `list_items` (same `lease_batch`), but `summarise` (`packages/mcp-server/src/index.ts:383`) omits `lease_batch` and archived members need `include_archived: true`. Expose batch membership in summaries (or point the prose at `claim.batch.members` / `get_item` with `include_archived`).
3. **Batch hardening (minor).** (a) same-batch admission in `assertWorkspaceFree` (`store.ts:1131-1141`) does not compare the incoming controller/assignee with the batch's holder — FRD-030 says one controller owns a batch workspace; (b) the declaring ticket is exempt from the "already taken" check (`store.ts:1221`), so a force-retaken isolated ticket can declare a batch after implementation started; (c) sibling stamps are sequential atomic writes (`store.ts:1359-1363`) — a crash mid-loop leaves a partial roster whose retry is `BATCH_FROZEN` with no repair path except manual frontmatter edits; consider ordering/rollback or an idempotent re-declaration when no member is taken.

## Why

Without 1 the FRD-030 AC4 batch flow is complete in core but unreachable through the hosted merge gate; 2 and 3 are correctness/robustness gaps in the same feature.

## Verification

- [ ] Merge-gate test: a PR whose body carries one footer per member of a frozen batch passes when all members are in Review with the same head attestation.
- [ ] Closeout prose/test names a discovery path that finds archived members.
- [ ] Core tests for 3a/3b/3c.
