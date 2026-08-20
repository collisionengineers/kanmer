# Checklist — GUI-098

- [ ] Reuse/finish CORE-034’s observational GUI Git helper with reciprocal MCP-copy comment.
- [ ] Prove helper reads symbolic branch and never repairs/checks out/renames/syncs.
- [ ] Extend existing `KanmerGitStatus` with exact nested health fields; add no IPC channel.
- [ ] Compose health in main from actual branch, `getBoardWithSource`, and active non-archived ticket count.
- [ ] Preserve all existing Git-status fields and non-Git behavior.
- [ ] Return deterministic healthy/wrong/detached/default-with-tickets repair text.
- [ ] Recompute health on project/status/sync/rename refresh points; no polling loop.
- [ ] Test expected, wrong, detached, unavailable branches and before/after Git immutability.
- [ ] Add pure renderer predicate for exact warning conditions.
- [ ] Add persistent accessible banner with actual/expected/path/source/count/repair.
- [ ] Reuse existing Settings opening for guidance; no new view.
- [ ] Keep board usable and handle status-fetch errors without false claims.
- [ ] Test wrong branch and default-with-tickets render.
- [ ] Test healthy file board, empty default, and null/non-Git render nothing.
- [ ] Test null actual branch and settings action.
- [ ] Manually simulate/restore wrong branch and capture screenshot/evidence.
- [ ] Run GUI tests/typecheck and `npm run verify`.
- [ ] Confirm App/existing status IPC are production callers.
- [ ] Confirm no MCP/core gate/take/sync-repair/view/channel/dependency/plugin/manual change.
- [ ] Open PR with `Kanmer: GUI-098`, link CORE-034, retain `docs_todo` until DOC-011.
- [ ] Stop at review readiness; do not merge or start another ticket.

## Progress notes

Append branch fixtures, before/after ref hashes, composed health JSON, banner screenshots, and command exits.
