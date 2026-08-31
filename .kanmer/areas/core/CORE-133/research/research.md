# Research — CORE-133: complete abandoned-claim recovery and bind FAIL proof routing

## Current base and sequencing

Audited exact `origin/main` `4fda54b4489fa4bc4b6b091c2af67715245ffa08` after CORE-126. Both behavioral defects remain. CORE-127 is currently the only shared reconciliation implementation and must merge first; CORE-133 then rebases and revalidates its overlapping MCP response/test/bundle surface before any edit.

Governing inputs are `docs/functional/frd/FRD-028-rescue-and-reconciliation.md` and HZN-008 `context.md`. Recovery remains dry-run first, apply second, CAS-bound and non-destructive.

## Expired-claim defect

The pure `packages/core/src/reconciliation.ts::reconcileEvidence` predicate currently admits:

- workspace state `clean | dirty | missing`; and
- claim identity `matches-claim | not-applicable`.

The real collector in `packages/mcp-server/src/reconciliation.ts::workspaceEvidence` emits:

- deleted recorded worktree: `missing + unavailable`;
- no recorded worktree: `not-recorded + not-applicable`.

Those production shapes receive no recommendation, while the synthetic and unreachable `missing + matches-claim` shape does.

The downstream apply/store path already supports the intended recovery:

- `applyReconciliation` re-collects, revision-checks and forwards `leaseRecoverySummary`;
- `KanmerStore.transferTicket` preserves the recorded branch/worktree/taken state and surviving dirty work;
- it independently refuses the board worktree, foreign repository and branch mismatch;
- neither missing nor unrecorded storage causes deletion because there is no workspace to remove.

The smallest safe classifier admits exactly:

- `clean | dirty` with `matches-claim`;
- `missing` with `unavailable`;
- `not-recorded` with `not-applicable`.

It continues to refuse live claims, board/foreign/branch-mismatched/detached/unreadable workspaces and synthetic `missing + matches-claim`.

## FAIL proof SHA defect

In Verifying, PASS checks `proof.mergedSha === pullRequest.mergeSha` before recommending Done. FAIL routes directly by `failureClass` without the same binding.

A stale FAIL from an earlier merge can therefore return a current ticket to Implementing or Preparing. The move is reversible but its evidence is not current. Apply remains explicit, so the fix belongs in the pure classifier: one merge-SHA guard covers both PASS and FAIL before either route.

Preserve:

- current-SHA implementation FAIL → Implementing;
- current-SHA plan FAIL → Preparing;
- transient/inconclusive → no move;
- PASS exact-SHA behavior;
- proof bytes and revision/CAS handling.

CORE-129 later replaces proof parsing centrally; its plan must retain this exact-SHA guard rather than re-open the decision.

## Tool-description finding

The ticket's third finding is already fixed on exact main by CORE-132 merge `c1bc3be8532150832328a6d7f62ecd94cdcf6220`. The current `reconcile_ticket` description explicitly tells clients to apply through `apply_reconciliation`; the obsolete “there is no apply surface” phrase has no current production/document match.

No production prose edit is needed unless CORE-127 regresses it. Add a small smoke assertion so the outcome remains protected and record this finding as already-fixed, not as manufactured source churn.

## Required tests

- Pure classifier matrix for all recoverable and refused workspace/identity pairs, including rejection of synthetic missing+matches.
- End-to-end collector plus `applyReconciliation` for deleted recorded worktree and no recorded worktree.
- Prove transfer changes controller/lease authority only and preserves branch/worktree/taken time and dirty-work evidence.
- Live claim in either shape remains unrecoverable.
- Board, foreign, branch-mismatch, detached and unavailable cases remain refused.
- Current-SHA FAIL routes for implementation and plan.
- Stale-SHA FAIL for both classes produces `PROOF_MERGE_SHA_MISMATCH`, no recommendation, apply refusal and byte-identical proof/status.
- Current reconcile tool description names the separate apply surface and omits the obsolete claim.

## Non-goals

No cleanup/delete operation, force takeover, new reconciliation action/tool, CORE-127 packet change, CORE-129 parser work, F-016 required-check ordering change, provider/GUI/workflow-stage work or unrelated refactor.
