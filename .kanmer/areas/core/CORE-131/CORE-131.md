---
id: CORE-131
type: ticket
title: >-
  Add apply_reconciliation: mutating recovery on revisions and leases (FRD-028
  acceptance 2-4)
status: verifying
area: core
assignee: claude-code
profile: feature
stageEntered:
  preparing: '2026-08-28T04:35:34.440Z'
  review: '2026-08-28T05:37:16.430Z'
  verifying: '2026-08-28T06:09:19.286Z'
taken_at: '2026-08-28T04:50:02.357Z'
branch: core-131-apply-reconciliation
worktree: .worktrees/core-131
labels:
  - reliable-autonomy
groups:
  - HZN-008
links: []
refs:
  - docs/functional/frd/FRD-028-rescue-and-reconciliation.md
commits:
  - abeb16978a4b3f8fece6e98d6bdf54e541544a1b
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/301'
archived: false
created: '2026-08-28T03:03:07.312Z'
updated: '2026-08-28T06:09:19.286Z'
---

## What

The apply half of FRD-028. [[CORE-122]] shipped the read-only inspector: `reconcile_ticket` collects board, Git, GitHub, CI, workspace and claim facts and returns typed findings plus an **advisory** recommendation, with no apply surface. FRD-028 acceptance 2 ("an explicit apply corrects only a still-current proposed action and records an audit entry; a changed revision returns a structured conflict"), acceptance 3 (routing merged-Review, PASS-Verifying, verification failures and abandoned claims to their correct stages) and acceptance 4 (dirty expired workspace preserved; cleanup only for a terminal, clean, explicitly authorised target) are all still unmet.

This is the ticket [[CORE-113]] was superseded to enable, and it is the last unfiled row of the HZN-008 breakdown. **Until it lands the horizon cannot meet its own first acceptance criterion** — "a broken or abandoned ticket state can be inspected dry-run first and safely reconciled without touching `.worktrees/kanmer` or deleting dirty work."

## Why

Everything CORE-113 lacked now exists and is merged:

- **[[CORE-114]]** gave a document-inclusive `revision` and `expected_revision` CAS. This closes CORE-113's terminal defect F-015 directly: a proof rewrite now changes the ticket's revision, so an apply that re-collects evidence and then mutates can no longer be fooled by a proof that flipped PASS→FAIL underneath it.
- **[[CORE-115]]** gave lease state (`current` / `expired`), `LEASE_LIVE`/`WORKSPACE_OCCUPIED` refusals and transfer-as-reclaim with evidence — so "abandoned claim" is now a fact the classifier can read rather than a guess.
- **[[CORE-125]]** put every ticket-file mutation under the board write lock, so an apply cannot lose a concurrent lease write.
- **[[SKILL-037]]** added `failure_class` (`implementation` / `plan` / `transient` / `inconclusive`, defaulting to inconclusive) to the proof record, which is what makes acceptance 3's typed verification routing expressible.

## Approach

- Salvage the apply half of PR #286 (`store.applyReconciliation`, the `apply_reconciliation` tool) as a starting point, but rebuild it on the contracts above rather than porting it: `expected_revision` instead of the bare `updated` CAS, the board write lock, and `leaseState` instead of the legacy claim predicate.
- Keep the CORE-122 split intact: core stays pure and classifies supplied evidence; the MCP boundary collects Git/GitHub facts; apply re-collects immediately before mutating and refuses on any drift.
- Actions limited to legal stage transitions plus claim release/transfer — `MOVE_TO_VERIFYING`, `MOVE_TO_IMPLEMENTING`, `MOVE_TO_DONE`, typed verification routing (implementation → Implementing, plan → Preparing, transient → retry in Verifying), `RELEASE_CLEAN_TERMINAL_CLAIM` and expired-claim recovery via CORE-115's transfer. No new stage, no force-push, no required-check bypass, no deletion of dirty work, no mutation of `.worktrees/kanmer`.
- Audit: record old/new responsible controller and the action durably, not only in the best-effort activity log — CORE-113's review raised this and it was never resolved.
- Roster moves 39 → 40, so every count assertion (smoke, smoke-protocol, AGENTS.md §4, `docs/manual/connect.md`, the generated manual chapter, tool-reference) and the plugin bundle must move together.

## Verification

- [ ] A dry-run still mutates nothing (regression on CORE-122's byte-identical proof).
- [ ] Apply refuses with a structured conflict when the ticket revision changed since the recommendation — including the CORE-113 F-015 case where only a proof document changed.
- [ ] Merged Review → Verifying, PASS Verifying → Done, and closed-unmerged → Implementing each apply from real fixture evidence.
- [ ] A FAIL proof routes by `failure_class`: implementation → Implementing, plan → Preparing, transient stays in Verifying.
- [ ] An expired claim with dirty work is recovered without deleting or cleaning the workspace; a live claim is refused.
- [ ] The board worktree is refused as a target in every path.
