---
id: CORE-133
type: ticket
title: >-
  Reconciliation classifier: recover abandoned claims with a missing or
  unrecorded workspace, and bind FAIL routing to the merge SHA
status: backlog
area: core
assignee: ''
profile: fix
labels:
  - reliable-autonomy
groups:
  - HZN-008
links:
  - CORE-131
refs:
  - docs/functional/frd/FRD-028-rescue-and-reconciliation.md
archived: false
created: '2026-08-28T06:03:50.873Z'
updated: '2026-08-28T06:03:50.873Z'
---

Filed by the independent review of [[CORE-131]] (PR #301, head `abeb16978a4b3f8fece6e98d6bdf54e541544a1b`). Two classifier gaps found in `packages/core/src/reconciliation.ts`; neither is unsafe, both leave FRD-028 behaviour unserved.

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

**Fix:** admit `state === "missing"` with `claimIdentity === "unavailable"`, and `state === "not-recorded"` with `claimIdentity === "not-applicable"`, while keeping the existing refusals for board, foreign-repository and branch-mismatched workspaces. Remove the unreachable `missing + matches-claim` combination or make it honest. Test each of the two shapes end-to-end through `applyReconciliation`, not only through the classifier.

## 2. FAIL routing is not bound to the current merge SHA (minor)

In the Verifying stage routes, the PASS path guards `proof.mergedSha !== pullRequest.mergeSha` with `PROOF_MERGE_SHA_MISMATCH` and returns no recommendation (`reconciliation.ts:165-170`). The FAIL path immediately below (`:171-192`) routes solely on `failureClass` and never compares the SHAs.

A Verifying ticket whose FAIL proof names a merge SHA from an earlier verification round can therefore produce a current `ROUTE_VERIFICATION_FAILURE` recommendation and be sent back to Implementing or Preparing on a stale record. The outcome is non-destructive (the proof is preserved, the move is backward and reversible, and it needs an explicit `apply_reconciliation` call), which is why this is minor rather than major — but the asymmetry with the PASS path is unintended.

**Fix:** reject a FAIL proof whose `merged_sha` is not the selected PR's merge SHA before routing, mirroring the PASS path.

## Not in scope

F-016 (`GH-3867261023`, red required checks pre-empting the closed-unmerged rollback) is inherited from CORE-122, was dispositioned minor there, and stays out of scope here.
