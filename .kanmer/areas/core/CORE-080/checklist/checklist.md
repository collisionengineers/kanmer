# Checklist — CORE-080

- [x] [pre-review] Reproduce and document the stale-cache manual Retry path and its live-branch safety boundary.
- [x] [pre-review] Add the `syncProject` manual-retry live inspection guard without duplicating the existing inspector.
- [x] [pre-review] Add regression coverage for mismatch refusal, exact-destination retry, and preserved genuine errors.
- [x] [pre-review] Align FRD-020 and board-sync manual text with retained old refs until `KANMER_BOARD_BRANCH` is updated.
- [x] [pre-review] Run focused GUI, typecheck, script/prose, and diff checks with exit-code evidence. Focused kanmerGit 26/26, core 283/283, scripts 89/89, verify:skills, verify:docs, check:manual, and diff-check pass. GUI typecheck and full GUI remain red only on inherited core/dispatch-antigravity mismatches; exact failures are preserved in scratch.
- [x] [pre-review] Write the post-implementation report, commit the branch, and open the PR for independent review. Commit `0e1be5f32efad1da57ee27bd2a2fe80033976bd1`, PR #201 targets `core-043-protection-retarget`.
- [x] [post-merge] Verify the exact merged commit on main and write final proof. — reconciled against merged-main proof; inherited external limits remain recorded.

## Progress notes

- 2026-08-22: Manual Retry now re-inspects the live board worktree through the existing inspect/refresh contract before sync; mismatches pause without Git mutation, while genuine paused errors remain visible.
- 2026-08-22: FRD-020 R5 and board-sync manual guidance now document retained old custom refs until `KANMER_BOARD_BRANCH` is updated.
- 2026-08-22: First focused filter invocation was invalid from the workspace cwd (no files matched); corrected focused command passed 26/26. Full GUI/typecheck inherited failures remain recorded in scratch.
- 2026-08-22: PR #201 opened from commit `0e1be5f32efad1da57ee27bd2a2fe80033976bd1`; independent review is required.


## 2026-08-23 Done reconciliation

All previously unticked items were reconciled against the ticket's merged-main proof, review/closeout records, or an explicit INCONCLUSIVE disposition already preserved there. No external or hosted limitation was upgraded to PASS by this edit.
