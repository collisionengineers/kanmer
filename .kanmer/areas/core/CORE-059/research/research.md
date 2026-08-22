# Research — CORE-059

## Question

How can a custom-to-custom board-branch rename remain safe after `kanmer-gate` reads the repository variable `KANMER_BOARD_BRANCH`?

## Findings

1. `apps/gui/src/main/kanmerGit.ts` is the only production rename seam. For a non-protected source branch it runs `git branch -m`, pushes `HEAD` to the destination, then deletes the old remote ref when it still exists. It has no GitHub API or repository-variable client.
2. `.github/workflows/pr.yml` fetches `${{ vars.KANMER_BOARD_BRANCH || 'kanmer-board' }}` for the merge gate. A custom-to-custom rename cannot update that repository variable from the GUI process.
3. `apps/gui/src/main/index.ts` applies the global setting to every open context and treats a successful `renameBoardBranch` result as the new cached branch. Automatic sync subsequently pushes the configured branch.
4. Existing real-Git coverage in `apps/gui/src/main/kanmerGit.test.ts` proves the old remote ref is deleted after a rename. That assertion encodes the unsafe behavior once the workflow variable is external state.
5. FRD-020 R5 requires push-before-delete, while ADR-0016 keeps GitHub protection and merge physics outside Kanmer. The review finding therefore requires either an explicit variable-update handoff before deletion or retaining the previous ref until an administrator retargets the workflow.

## Implications

The GUI cannot truthfully claim to update `KANMER_BOARD_BRANCH`. The bounded safe behavior is to complete the local rename and publish the destination, but retain the previous remote ref and return a visible warning instructing the administrator to update the repository variable and remove the old ref after the gate is retargeted. This preserves the gate's existing ref and avoids deleting the only branch it can fetch. The change stays local to the rename seam, its real-Git tests, and the board-sync/troubleshooting guidance.
