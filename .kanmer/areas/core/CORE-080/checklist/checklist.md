# Checklist — CORE-080

- [x] [pre-review] Reproduce and document the stale-cache manual Retry path and its live-branch safety boundary.
- [x] [pre-review] Add the `syncProject` manual-retry live inspection guard without duplicating the existing inspector.
- [x] [pre-review] Add regression coverage for mismatch refusal, exact-destination retry, and preserved genuine errors.
- [x] [pre-review] Align FRD-020 and board-sync manual text with retained old refs until `KANMER_BOARD_BRANCH` is updated.
- [x] [pre-review] Run focused GUI, typecheck, script/prose, and diff checks with exit-code evidence. Focused kanmerGit 26/26, scripts 89/89, verify:skills, verify:docs, check:manual, and diff-check pass. GUI typecheck and full GUI remain red only on inherited core/dispatch-antigravity mismatches; exact failures are preserved in scratch.
- [ ] [pre-review] Write the post-implementation report, commit the branch, and open the PR for independent review.
- [ ] [post-merge] Verify the exact merged commit on main and write final proof.

## Progress notes

- 2026-08-22: Manual Retry now re-inspects the live board worktree through the existing inspect/refresh contract before sync; mismatches pause without Git mutation, while genuine paused errors remain visible.
- 2026-08-22: FRD-020 R5 and board-sync manual guidance now document retained old custom refs until `KANMER_BOARD_BRANCH` is updated.
- 2026-08-22: First focused filter invocation was invalid from the workspace cwd (no files matched); corrected focused command passed 26/26. Full GUI/typecheck inherited failures remain recorded in scratch.
