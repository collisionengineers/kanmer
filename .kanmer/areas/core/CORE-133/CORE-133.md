---
id: CORE-133
type: ticket
title: >-
  Reconciliation classifier: recover abandoned claims with a missing or
  unrecorded workspace, and bind FAIL routing to the merge SHA
status: implementing
area: core
assignee: claude-code
profile: fix
stageEntered:
  preparing: '2026-08-31T17:53:36.025Z'
taken_at: '2026-09-02T02:57:10.443Z'
branch: CORE-133-reconciliation-missing-workspace
worktree: .worktrees/core-133
claim_expires_at: '2026-09-04T00:02:58.461Z'
claim_controller: claude-code
lease_id: b02f666a-82e9-45d6-a86c-af6d2bac0173
lease_revision: 7
lease_workspace: 'worktree:c:\users\alex\documents\github\kanmer\.worktrees\core-133'
lease_provider: claude-code
lease_phase: running-command
lease_heartbeat_at: '2026-09-03T23:17:58.461Z'
labels:
  - reliable-autonomy
groups:
  - HZN-008
links:
  - CORE-131
blocks:
  - CORE-119
refs:
  - docs/functional/frd/FRD-028-rescue-and-reconciliation.md
archived: false
created: '2026-08-28T06:03:50.873Z'
updated: '2026-09-03T23:17:58.461Z'
---

Filed by the independent review of [[CORE-131]] (PR #301, head `abeb16978a4b3f8fece6e98d6bdf54e541544a1b`). Two classifier gaps found in `packages/core/src/reconciliation.ts`; neither is unsafe, both leave FRD-028 behaviour unserved. Both were **independently re-confirmed by the post-merge verification** of CORE-131 (proof `b8dc5101d0c90fba` at merge SHA `45215955`).

## 1. Expired-claim recovery is unreachable for a missing or unrecorded workspace (major)

`reconciliation.ts:139-146` gates `RECOVER_EXPIRED_CLAIM` on

```
(workspace.state === "clean" | "dirty" | "missing")
&& (workspace.claimIdentity === "matches-claim" | "not-applicable")
```

`workspaceEvidence` (`packages/mcp-server/src/reconciliation.ts:246,253-255`) can only ever emit these two shapes for a workspace that is gone:

| production case | emitted evidence | predicate |
|---|---|---|
| recorded worktree deleted (ENOENT) | `{ state: "missing", claimIdentity: "unavailable" }` | **rejected** |
| no worktree recorded at all | `{ state: "not-recorded", claimIdentity: "not-applicable" }` | **rejected** |

Verified by execution against the built collector at the PR head:

```
workspaceEvidence(deleted worktree) = {"state":"missing","recordedWorktree":".worktrees/GONE","claimIdentity":"unavailable"}
workspaceEvidence(no worktree)      = {"state":"not-recorded","recordedWorktree":null,"claimIdentity":"not-applicable"}

  clean + matches-claim (control)    -> RECOVER_EXPIRED_CLAIM
  dirty + matches-claim (AC4)        -> RECOVER_EXPIRED_CLAIM
  missing + unavailable (real)       -> NO RECOMMENDATION
  missing + matches-claim (synth)    -> RECOVER_EXPIRED_CLAIM
  not-recorded + not-applicable      -> NO RECOMMENDATION
```

So the `"missing"` arm of the state disjunction is **dead code**: the only input that satisfies it (`missing` + `matches-claim`) is a shape the collector cannot produce.

FRD-028's Behaviour section names "expired claim with dirty work, commits, **a missing worktree or no surviving work**" among the states the reconciler recognizes, and acceptance 3 requires abandoned claims to "route to their correct stages or terminal outcomes". Dirty and clean recover; the other two named shapes do not.

The code comment justifies the exclusion as "an identity the transfer would itself refuse … or cannot prove". That reasoning does not hold for these two shapes: `transferTicket` (`packages/core/src/store.ts:1569-1586`) refuses only `boardWorktree`, `foreign-repository` and `branch-mismatch`. It would accept a missing or unrecorded workspace — there is nothing to reclaim and nothing to destroy, which is precisely the abandoned-claim case.

**It fails closed**, which is why CORE-131 shipped without it: the dry run still diagnoses the state, apply refuses `RECONCILIATION_INCONCLUSIVE`, and the operator falls back to `take_ticket action: "transfer"` at the same authority. This ticket closes the gap; nothing is unsafe meanwhile.

**Fix:** admit `state === "missing"` with `claimIdentity === "unavailable"`, and `state === "not-recorded"` with `claimIdentity === "not-applicable"`, while keeping the existing refusals for board, foreign-repository and branch-mismatched workspaces. Remove the unreachable `missing + matches-claim` combination or make it honest. Test each of the two shapes end-to-end through `applyReconciliation`, not only through the classifier.

## 2. FAIL routing is not bound to the current merge SHA (minor)

In the Verifying stage routes, the PASS path guards `proof.mergedSha !== pullRequest.mergeSha` with `PROOF_MERGE_SHA_MISMATCH` and returns no recommendation (`reconciliation.ts:165-170`). The FAIL path immediately below (`:171-192`) routes solely on `failureClass` and never compares the SHAs.

A Verifying ticket whose FAIL proof names a merge SHA from an earlier verification round can therefore produce a current `ROUTE_VERIFICATION_FAILURE` recommendation and be sent back to Implementing or Preparing on a stale record. The outcome is non-destructive (the proof is preserved, the move is backward and reversible, and it needs an explicit `apply_reconciliation` call), which is why this is minor rather than major — but the asymmetry with the PASS path is unintended.

**Fix:** reject a FAIL proof whose `merged_sha` is not the selected PR's merge SHA before routing, mirroring the PASS path.

## 3. Stale tool description (already fixed on current main; regression proof remains)

`packages/mcp-server/src/index.ts:957` still tells clients "there is no apply surface" on the `reconcile_ticket` description, which CORE-131 made false when it shipped `apply_reconciliation`. Recorded as R-004 and dispositioned accepted residual risk there rather than filed separately.

It is folded in here — not as new scope, but because this ticket is the next thing to touch `reconcile_ticket` and **nothing else will catch it**: the description ships inside the plugin bundle, and `check-plugin-sync.mjs` compares tool *names* only, so no rail flags a stale description. Fix it in passing.

**Current disposition (2026-08-31): already-fixed.** Exact main `4fda54b4489fa4bc4b6b091c2af67715245ffa08` contains the corrected description from CORE-132 merge `c1bc3be8532150832328a6d7f62ecd94cdcf6220`: it names `apply_reconciliation` and the obsolete phrase is absent. CORE-133 will add a regression assertion and will edit production prose only if CORE-127 regresses it.

## Not in scope

F-016 (`GH-3867261023`, red required checks pre-empting the closed-unmerged rollback) is inherited from CORE-122, was dispositioned minor there, and stays out of scope here.

## Verification

- [ ] A deleted recorded worktree (`missing` + `unavailable`) and an unrecorded workspace (`not-recorded` + `not-applicable`) each recover end-to-end through `apply_reconciliation`, not only through the classifier.
- [ ] Board, foreign-repository and branch-mismatched workspaces are still refused.
- [ ] A FAIL proof naming a stale merge SHA is refused before routing, mirroring the PASS path.
- [ ] `reconcile_ticket`'s description no longer claims there is no apply surface.
