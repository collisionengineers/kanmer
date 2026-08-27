# Checklist — CORE-125

- [ ] Create `.worktrees/core-125` from `origin/main` 9c9a6980 on a new branch and record the head SHA.
- [ ] Record the baseline `npm test -w @kanmer/core` exit code, test count (417) and wall time before any edit.
- [ ] Add the concurrent `renewTicket` + `updateItem` race test to `packages/core/src/claims.test.ts` (barrier on the renewing store's `getBoard`, two `KanmerStore` instances).
- [ ] Run that test against unmodified store code and record the failure output verbatim (proves the defect).
- [ ] Make `withLeaseLock` re-entrant within one async context via an `AsyncLocalStorage` set of held lock-file paths, with a comment naming the nested call paths.
- [ ] Move `updateItem`'s locate → read → CAS → backward-move → gate → write → activity block inside `withLeaseLock`, leaving argument validation outside and reordering nothing.
- [ ] Put `setDoc`'s and `appendScratch`'s CAS + write inside `withLeaseLock`.
- [ ] Leave `moveItem`'s `assertMoveAllowed` → `computeOrder` → `updateItem` shape unlocked at the outer level and record why in a code comment (column-wide materialisation must not hold a board-wide lock).
- [ ] [pre-review] New test passes and all 417 existing core tests pass unchanged; record the new wall time beside the baseline.
- [ ] [pre-review] Confirm no nested path deadlocks: CORE-121 backward-move, renew phase-change, six-store concurrent renewal, CORE-124 batch and `moveItem` position tests all pass.
- [ ] [pre-review] Assert no `leases.lock` / `.owner-*` / `.stale-*` residue remains in `.kanmer` after ordinary update/move/setDoc calls.
- [ ] [pre-review] Name the production callers that inherit the fix (mcp-server `update_item`/`move_item`/`set_ticket_doc`/`append_scratch`; GUI IPC handlers) — no code change needed in either.
- [ ] Update the `AGENTS.md` §8 lease-lock gotcha to state that every ticket-file mutation now runs under `.kanmer/leases.lock`.
- [ ] [pre-review] Run the full rail with exact exit codes: `npm test -w @kanmer/core`, `node packages/mcp-server/src/smoke.mjs`, `npm run smoke:protocol`, `npm run typecheck`, `npm run plugin:check`, `npm run verify`.
- [ ] [pre-review] No test weakened, no `apps/gui` edit, no dependency added, no file outside the plan's Expected files table changed.
- [ ] Commit, push, open the PR with a `Kanmer: CORE-125` footer, write the post-implementation report and move the ticket to Review.
- [ ] [pre-review] Stop at that boundary: no review, merge, verification or closeout.

## Progress notes
