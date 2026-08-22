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
- [ ] proof.md finalised for merged-main verification
- [ ] Moved to final stage
- [x] Outcome records the exact cumulative basis and hosted/live INCONCLUSIVE boundary
- [ ] worktree removed
- [ ] branch deleted
- [x] fetch/prune performed during correction
- [ ] take_ticket release

## Merged-main verification / closeout

- [x] Both recorded commits reachable from origin/main fdaededc; proof rewritten to merged-main evidence.
- [x] IO/source/core/store/typecheck/scripts/docs/skills/agents/diff rails recorded; HTTP timeout preserved INCONCLUSIVE.
- [x] PR #169 merge is reachable in the cumulative origin/main lineage.
- [ ] Exact worktree/branch cleanup and release pending.
