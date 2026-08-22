# Research — CORE-080: manual retry and retained-ref contract

## Question

What exact paths let a paused board-sync project retry, and which shipped requirement must be aligned with the retained remote-ref handoff introduced by CORE-043?

## Findings

- `apps/gui/src/main/index.ts` (`syncProject`) distinguishes automatic from manual sync, but only automatic sync calls `inspectBoardWorktree` and `refreshBoardBranch` before `syncBoard`; a manual retry of a paused status goes directly to `syncBoard` using the cached `status.branch`.
- `apps/gui/src/main/kanmerGit.ts` (`syncBoard`) pushes to `refs/heads/${status.branch}`. If an administrator has moved the live worktree before pressing Retry, the cached branch can be stale and the retry can recreate or update the retired branch.
- `apps/gui/src/main/kanmerGit.ts` (`renameBoardBranch`) intentionally retains the old remote ref for custom-to-custom renames because the local process cannot update the hosted `KANMER_BOARD_BRANCH` Actions variable. It reports the required variable update and deferred deletion to the operator.
- `docs/functional/frd/FRD-020-board-git-worktree-sync.md` and `docs/manual/board-sync.md` in the CORE-043 head describe the retained-ref handoff in prose, but the FRD's R5 acceptance wording still contains the older push-then-delete contract. The independent review on PR #168 identified this specification drift.
- `apps/gui/src/main/kanmerGit.test.ts` already has real-Git rename, branch-mismatch, pause, and timer coverage, so the fix should extend the paired helper/IPC path rather than introduce another sync implementation.

## Implications

The smallest fix is a manual-retry preflight using the existing live inspector and mismatch state, followed by focused tests proving a mismatched live branch cannot reach `syncBoard`. The FRD acceptance/R5 text must be made authoritative for the retained-ref handoff, while protected-default refusal and ordinary custom rename behaviour remain unchanged. No new dependency or provider surface is needed.

## Open questions

- None: the existing live inspection contract and CORE-043 retained-ref decision are the governing decisions.
