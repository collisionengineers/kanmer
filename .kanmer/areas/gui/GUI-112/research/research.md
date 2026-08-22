# GUI-112 research — current-head CORE-043 handoff findings

## Question

What remains unsafe or misleading in the current cumulative CORE-043 branch-handoff implementation at PR #168 head `e78323d7fb8ce695e40db80380d189e236726b25`, and what bounded GUI/workflow/document changes close those findings without adding a GitHub API or changing the protected-main policy?

## Evidence

1. **Custom-to-custom handoff still needs an explicit hosted-variable contract.** PR #168 review thread 3836130697 reports that `renameBoardBranch` pushes the destination but cannot update `KANMER_BOARD_BRANCH`; the old remote ref must remain until the operator updates the Actions variable. The implementation already retains that ref, but Settings/manual wording still says the old branch is deleted immediately. Sources: `apps/gui/src/main/kanmerGit.ts` `renameBoardBranch`, `apps/gui/src/renderer/src/components/Settings.tsx`, `docs/manual/board-sync.md`, FRD-020 R5.

2. **The repository convention must be available to local MCP processes.** Thread 3836189723 notes that `get_status` reads `process.env.KANMER_BOARD_BRANCH`, while GUI-created registrations pass only `ELECTRON_RUN_AS_NODE` or no environment. A custom handoff therefore makes a correctly migrated local board look mismatched to agents. Sources: `packages/mcp-server/src/index.ts`, `apps/gui/src/main/connect.ts`, `apps/gui/src/main/providers.ts`, `scripts/agents-block-body.mjs`.

3. **Ordinary custom-to-custom rename is blocked by using the requested destination as the preflight expectation.** Thread 3836189719 identifies that `applyGitPreferences` calls `refreshBoardBranch(status, requestedBranch)`; a healthy worktree still on the cached current custom branch is classified as a mismatch, so `renameBoardBranch` never runs. Source: `apps/gui/src/main/index.ts` and the paired `refreshBoardBranch`/live-branch helpers.

4. **The Settings surface hides a protected reconciliation failure.** Thread 3836720320 identifies that `ensureBoardWorktree` returns `available: false` with a real `boardRoot` and explanatory error when a closed project still sits on the protected branch, while `GitTab` renders all unavailable statuses as non-Git and drops the error/retry surface. Sources: `apps/gui/src/main/kanmerGit.ts`, `apps/gui/src/renderer/src/components/Settings.tsx`, shared IPC `KanmerGitStatus`.

5. **The operator handoff needs to be durable and consistent.** Thread 3836130705 asks for the `KANMER_BOARD_BRANCH` convention in AGENTS.md; the managed body already names the variable, but it does not state the retained-ref/update-before-delete rule in the same explicit form as the implementation. The source of truth is `scripts/agents-block-body.mjs`, mirrored into `AGENTS.md` and the setup skill; changing the convention requires keeping those copies synchronized.

6. **The workflow variable must be updated for every custom rename.** Thread 3836130697/3836130697's disposition permits retaining the old ref until the variable is updated; the workflow already consumes `vars.KANMER_BOARD_BRANCH`, so this ticket should make the requirement explicit in the operator-facing UI/manual/FRD and add a static workflow regression that forbids a literal board fetch. It must not attempt a live GitHub variable or protection mutation.

7. **Existing protections are intentional and remain.** CORE-043's research/plan and FRD-020 document refusal from protected `kanmer-board`, no GitHub API/App, push-before-delete ordering, live-branch preflight, paused sync, and external protection proof as INCONCLUSIVE. CORE-080/084 already cover manual Retry preflight and production-caller safety; GUI-112 should preserve those tests and only extend the remaining seams.

## Implications

- Reuse `refreshBoardBranch`, `inspectBoardWorktree`, `preflightBoardSync`, and `serverInvocation`; do not create a parallel branch inspector or a GitHub integration.
- Separate “is the live worktree still on the cached branch?” from “did an administrator complete the handoff to the requested branch?” so ordinary custom renames remain automatic while unexpected branches remain fail-closed.
- Carry the configured branch into GUI-created MCP invocation environments, retaining the rootless portable launcher contract for the default branch where no extra value is needed.
- Treat a failed Git reconciliation with a retained board root as a distinct visible Git failure, and make Retry re-run reconciliation rather than mislabeling it as a non-Git project.
- Keep the old custom remote ref until an operator updates the hosted variable and then deletes it; no local rail claims hosted protection/variable success.
