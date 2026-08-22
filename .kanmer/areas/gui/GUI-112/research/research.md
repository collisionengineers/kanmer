# GUI-112 research — current-head CORE-043 handoff findings

## Question

What remains unsafe or misleading in the current cumulative CORE-043 branch-handoff implementation at PR #168 head `e78323d7fb8ce695e40db80380d189e236726b25`, and what bounded GUI/workflow/document changes close those findings without adding a GitHub API or changing the protected-main policy?

## Evidence

1. **Custom-to-custom handoff still needs an explicit hosted-variable contract.** PR #168 review thread 3836130697 reports that `renameBoardBranch` pushes the destination but cannot update `KANMER_BOARD_BRANCH`; the old remote ref must remain until the operator updates the Actions variable. The implementation already retains that ref, but Settings/manual wording still says the old branch is deleted immediately. Sources: `apps/gui/src/main/kanmerGit.ts` `renameBoardBranch`, `apps/gui/src/renderer/src/components/Settings.tsx`, `docs/manual/board-sync.md`, FRD-020 R5.

2. **Ordinary custom-to-custom rename is blocked by using the requested destination as the preflight expectation.** Thread 3836189719 identifies that `applyGitPreferences` calls `refreshBoardBranch(status, requestedBranch)`; a healthy worktree still on the cached current custom branch is classified as a mismatch, so `renameBoardBranch` never runs. Source: `apps/gui/src/main/index.ts` and the paired `refreshBoardBranch`/live-branch helpers.

3. **The Settings surface hides a protected reconciliation failure.** Thread 3836720320 identifies that `ensureBoardWorktree` returns `available: false` with a real `boardRoot` and explanatory error when a closed project still sits on the protected branch, while `GitTab` renders all unavailable statuses as non-Git and drops the error/retry surface. Sources: `apps/gui/src/main/kanmerGit.ts`, `apps/gui/src/renderer/src/components/Settings.tsx`, shared IPC `KanmerGitStatus`.

4. **The workflow variable must be updated for every custom rename.** Thread 3836130697's accepted alternative is retaining the old remote ref until the operator updates the Actions variable; the workflow already consumes `vars.KANMER_BOARD_BRANCH`, so this ticket makes the requirement explicit in the operator-facing UI/manual/FRD and keeps static workflow assertions forbidding a literal board fetch. It must not attempt a live GitHub variable or protection mutation.

5. **Managed AGENTS/local-MCP propagation is a separate remediation.** Threads 3836130705 and 3836189723 are explicitly assigned to linked MCP-044, which owns the source-of-truth managed instructions and GUI/provider-to-MCP environment wiring. GUI-112 links MCP-044 and does not duplicate those changes.

6. **Existing protections are intentional and remain.** CORE-043's research/plan/report and FRD-020 document refusal from protected `kanmer-board`, no GitHub API/App, push-before-delete ordering, live-branch preflight, paused sync, and external protection proof as INCONCLUSIVE. CORE-080/084 already cover manual Retry preflight and production-caller safety; GUI-112 should preserve those tests and only extend the remaining seams.

## Implications

- Reuse `refreshBoardBranch`, `inspectBoardWorktree`, `preflightBoardSync`, and `syncTimer`; do not create a parallel branch inspector or GitHub integration.
- Separate “is the live worktree still on the cached branch?” from “did an administrator complete the handoff to the requested branch?” so ordinary custom renames remain automatic while unexpected branches remain fail-closed.
- Treat a failed Git reconciliation with a retained board root as a distinct visible Git failure, and make Retry re-run reconciliation rather than mislabeling it as a non-Git project.
- Keep the old custom remote ref until an operator updates the hosted variable and then deletes it; no local rail claims hosted protection/variable success.
- Leave local MCP branch propagation and managed AGENTS synchronization to linked MCP-044.

## Disposition of current-head threads

- 3836130697: fixed here through retained-ref/UI/manual/workflow wording and static coverage.
- 3836189719: fixed here through cached-branch preflight and ordinary-rename regression.
- 3836720320: fixed here through visible failed-Git status and retryable reconciliation.
- 3836130705 and 3836189723: deferred to linked MCP-044; no duplicate implementation.
- Hosted protection/Actions-variable retargeting: explicit INCONCLUSIVE boundary, not fabricated.
