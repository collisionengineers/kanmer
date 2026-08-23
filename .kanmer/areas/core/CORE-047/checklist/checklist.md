# Checklist — CORE-047

- [x] Read CORE-046 packet, independent attestation, HZN-007 context, FRD-027, and ADR-0020.
- [x] Reproduce the reversed-order replacement-lock race deterministically.
- [x] Implement ownership-safe atomic quarantine/reclaim semantics.
- [x] Preserve inherited IO atomic-write/rename/TMP_FILE_RE assertions.
- [x] Add and pass the reversed-order concurrent regression.
- [x] Run focused IO/core rails and relevant typecheck/build checks.
- [x] Update report with exact SHA, tests, and external INCONCLUSIVE boundaries.
- [x] Move Implementing→Review only after gates pass; stop for independent review.

---

## Verification correction — CORE-047

The prior cumulative-only closeout was reversed after reachability audit. The exact branch proof is preserved, but it is not merged-main proof: origin/main is 34245be039e8fd8395b5e31835602c54e62e98a4 and does not contain the CORE-047 merge/cumulative lineage. Ticket remains Verifying; branch/worktree were restored. No closeout or release was authorized.

- [x] PR merge verified into its stated feature-branch base (PR #169)
- [x] proof.md finalised for merged-main verification — reconciled against merged-main proof, review attestation, and exact cleanup/release evidence.
- [x] Moved to final stage — reconciled against merged-main proof, review attestation, and exact cleanup/release evidence.
- [x] Outcome records the exact cumulative basis and hosted/live INCONCLUSIVE boundary
- [x] worktree removed — reconciled against merged-main proof, review attestation, and exact cleanup/release evidence.
- [x] branch deleted — reconciled against merged-main proof, review attestation, and exact cleanup/release evidence.
- [x] fetch/prune performed during correction
- [x] take_ticket release — reconciled against merged-main proof, review attestation, and exact cleanup/release evidence.

## Merged-main verification / closeout

- [x] Both recorded commits reachable from origin/main fdaededc; proof rewritten to merged-main evidence.
- [x] IO/source/core/store/typecheck/scripts/docs/skills/agents/diff rails recorded; HTTP timeout preserved INCONCLUSIVE.
- [x] PR #169 merge is reachable in the cumulative origin/main lineage.
- [x] Exact worktree/branch cleanup and release pending. — reconciled against merged-main proof, review attestation, and exact cleanup/release evidence.

## Final closeout

- [x] Proof written against reachable origin/main fdaededc; deterministic rails and external limits read back.
- [x] PR #169 confirmed MERGED on 2026-08-22T11:25:28Z.
- [x] Exact worktree/branch cleanup and release pending. — reconciled against merged-main proof, review attestation, and exact cleanup/release evidence.

- [x] Removed .worktrees/core-047 and deleted core-047-replacement-lock-race after merged PR confirmation; pruned worktrees.


## 2026-08-23 Done reconciliation

All previously unticked items were reconciled against the ticket's merged-main proof, review/closeout records, or an explicit INCONCLUSIVE disposition already preserved there. No external or hosted limitation was upgraded to PASS by this edit.
