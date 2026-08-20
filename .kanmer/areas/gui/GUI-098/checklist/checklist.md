# Checklist — GUI-098

- [x] Reuse/finish CORE-034’s observational GUI Git helper with reciprocal MCP-copy comment.
- [x] Prove helper reads symbolic branch and never repairs/checks out/renames/syncs.
- [x] Extend existing `KanmerGitStatus` with exact nested health fields; add no IPC channel.
- [x] Compose health in main from actual branch, `getBoardWithSource`, and active non-archived ticket count.
- [x] Preserve all existing Git-status fields and non-Git behavior.
- [x] Return deterministic healthy/wrong/detached/default-with-tickets repair text.
- [x] Recompute health on project/status/sync/rename refresh points; no polling loop.
- [x] Test expected, wrong, detached, unavailable branches and before/after Git immutability.
- [x] Add pure renderer predicate for exact warning conditions.
- [x] Add persistent accessible banner with actual/expected/path/source/count/repair.
- [x] Reuse existing Settings opening for guidance; no new view.
- [x] Keep board usable and handle status-fetch errors without false claims.
- [x] Test wrong branch and default-with-tickets render.
- [x] Test healthy file board, empty default, and null/non-Git render nothing.
- [x] Test null actual branch and settings action.
- [ ] Manually simulate/restore wrong branch and capture screenshot/evidence.
- [x] Run GUI tests/typecheck and `npm run verify`.
- [x] Confirm App/existing status IPC are production callers.
- [x] Confirm no MCP/core gate/take/sync-repair/view/channel/dependency/plugin/manual change.
- [x] Open PR with `Kanmer: GUI-098`, link CORE-034, retain `docs_todo` until DOC-011.
- [x] Stop at review readiness; do not merge or start another ticket.

## Progress notes

- Isolated fixture branch: `kanmer-board → wrong-board → kanmer-board`; restoration confirmed by `git branch --show-current`.
- A Windows-locked session prevented a usable banner screenshot: the capture showed the lock screen. This remains deliberately unticked and is documented in the post-implementation report.
- `npm test --workspace @kanmer/gui -- --maxWorkers=1 --minWorkers=1`: 29 files / 296 tests passed.
- GUI typecheck and GUI production build passed. `npm run verify` is not defined; root typecheck has an unrelated pre-existing `TicketDocsInfo.documentPaths` demo-fixture failure.

---

## Closeout — GUI-098

- [x] PR merge verified (`gh pr view --json state,mergedAt`)
- [x] proof.md finalised (PR URL + merge date appended)
- [x] Moved to final stage
- [x] Outcome recorded in ticket body (PR link, follow-ups)
- [x] cd out of worktree; `git worktree remove .worktrees/gui-098`
- [x] `git branch -d gui-098-board-worktree-banner` (`-D` if squash/rebase-merged)
- [x] `git fetch --prune` + `git worktree prune`
- [ ] `take_ticket action: "release"`
