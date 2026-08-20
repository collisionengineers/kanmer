# Plan — GUI-098: board-worktree health banner

## Objective

Show a persistent, non-blocking warning when the GUI is serving a board worktree on the wrong/unavailable branch or a synthesized board configuration despite existing tickets, using main-process observation and the existing Git-status IPC.

## Starting state

- GUI has `KanmerGitStatus` and existing `getKanmerGitStatus` IPC, but status records configured branch rather than independently observed branch/source health.
- CORE-034 defines the paired observational helper/health semantics.
- App has existing banner/toast/settings surfaces but no board-worktree warning.

## Governing docs

- **FRD-020:** board worktree observation/repair ownership; DOC-011 formalizes delta.
- **EPIC-009 / MASTERPLAN S-13:** GUI banner, deliberate helper duplication, no MCP client/repair/blocking.

## Required changes

1. Rebase after CORE-034 if it has landed; reuse its final `inspectBoardWorktree` helper in `kanmerGit.ts`. If not, implement the exact helper from CORE-034 once and leave reciprocal comment for MCP copy.
2. Ensure inspection runs `git symbolic-ref --short HEAD` at board root, catches errors to null, and never calls branch rename/checkout/ensure/sync.
3. Define/export a shared `BoardWorktreeHealth` nested type with fields: `path`, `expectedBranch`, `actualBranch`, `onBoardBranch`, `boardSource`, `ticketCount`, `repair`.
4. Extend `KanmerGitStatus` with `boardWorktree: BoardWorktreeHealth | null`; non-Git projects may return null and must not warn.
5. In main `getKanmerGitStatus` handler (and status-building helper), obtain current project context/store without initialization.
6. Read `getBoardWithSource()` and `listItems({includeArchived:true})`; count only `type === "ticket" && !archived`.
7. Inspect actual branch at current board root with expected configured `kanmerBranch`.
8. Compose deterministic repair text consistent with CORE-034:
   - healthy: no repair required;
   - wrong branch: name actual/expected/path and direct operator to Settings/setup repair;
   - unavailable/detached: state inspection unavailable/detached and expected branch;
   - default + tickets: explain board.yml/config is synthesized while ticket files exist and require board repair.
9. Keep existing available/boardRoot/branch/lastSync/error/paused fields for compatibility.
10. Recompute health after project open, each explicit status request, successful/failed sync, and branch rename. Do not trust stale cached health after a Git operation.
11. Add main tests using temporary repositories:
    - expected branch → `onBoardBranch:true`;
    - different branch → false with names;
    - detached HEAD → null/false;
    - unavailable/non-Git → non-throwing;
    - capture HEAD/ref/worktree-list before/after and assert inspection changed nothing.
12. Add a pure renderer predicate `shouldShowBoardWorktreeBanner(health)`:
    - false for null/non-Git;
    - true for `!onBoardBranch`;
    - true for `boardSource === "default" && ticketCount > 0`;
    - false for healthy file board;
    - false for healthy empty default.
13. Add presentational banner component with `role="alert"` or suitable persistent status semantics, concise title, actual/expected/path/source/count detail, and repair text.
14. Offer “Open Git settings” only by reusing App’s existing settings-open/tab mechanism. If Settings cannot be deep-linked without new state, open Settings generally and label accurately.
15. In App, request status when project context becomes ready, after change-signal refresh, after window focus using existing listener pattern, and after sync/settings operations that already return status. Coalesce/cancel stale async requests; no interval polling.
16. Render banner near the project-level content header so it is visible across Board/Standup/Archived but does not create a fourth view or block interactions.
17. If status fetch fails, preserve current board and show ordinary error/status only; do not synthesize a wrong-branch claim without evidence.
18. Add renderer tests for every predicate and rendered detail/action. Healthy cases render empty DOM.
19. Run GUI/main tests/typecheck and full verification; manually simulate wrong branch and restore it under operator control, recording before/after branch and screenshot.
20. Confirm production caller is App’s existing project shell and existing status IPC; no dead component.
21. Confirm no MCP/core gate/take/sync repair/view/package/lock/plugin/manual changes.
22. Open PR with `Kanmer: GUI-098`, link CORE-034, and keep `docs_todo` until DOC-011 links FRD deltas.

## Expected files

- `apps/gui/src/main/kanmerGit.ts`
- `apps/gui/src/main/kanmerGit.test.ts`
- `apps/gui/src/shared/ipc.ts`
- `apps/gui/src/main/index.ts`
- `apps/gui/src/renderer/src/App.tsx`
- new banner component/test (or equivalent existing component location)
- `apps/gui/src/renderer/src/styles.css`

## Do not modify

MCP server, core gates/take, board repair/sync behavior, ticket files, IPC channel roster, app view roster, dependencies, plugin/manual/generated artifacts.

## Acceptance checks

- Actual branch is independently observed and inspection is mutation-free.
- Existing status IPC carries exact health fields plus board source/active ticket count.
- Wrong/unavailable branch and default-with-tickets show actionable banner.
- Healthy board and empty greenfield default show nothing.
- Board remains fully usable; no auto repair/blocking/MCP dependency.
- Tests, manual simulation, screenshot, and full verification pass.

## Commands

```bash
npm test --workspace @kanmer/gui
npm run typecheck --workspace @kanmer/gui
npm run verify
git diff --check
git status --short
```

## Failure and deviation rules

- Do not call MCP, add IPC, trust configured branch as actual, mutate Git during inspection, auto-repair, or block the board.
- Do not warn for a legitimate empty default board.
- Restore any manual wrong-branch fixture before stopping; retain exact evidence.
- Do not merge or start another ticket.

## Stop condition

Stop when simulated wrong/unavailable branch and inconsistent default-board states show the exact persistent banner, healthy/empty-default states show nothing, inspection proves no Git mutation, existing workflows remain usable, tests/verification and screenshots pass, and the PR is ready for independent review. Do not merge.
