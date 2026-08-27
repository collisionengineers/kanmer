# Checklist — CORE-125

- [x] Create `.worktrees/core-125` from `origin/main` 9c9a6980 on a new branch and record the head SHA. — created from `origin/main` **f3060b06** (GUI-144 #294 merged during planning), branch `core-125-serialise-ticket-writers`.
- [x] Record the baseline `npm test -w @kanmer/core` exit code, test count (417) and wall time before any edit. — exit 0, 19 files, 417 tests, 69.97 s.
- [x] Add the concurrent `renewTicket` + `updateItem` race test to `packages/core/src/claims.test.ts` (barrier on the renewing store's `getBoard`, two `KanmerStore` instances).
- [x] Run that test against unmodified store code and record the failure output verbatim (proves the defect). — exit 1: `expected 'A' to be 'edited during the renewal'`; the second test also failed `expected 1 to be 2` (lease_revision reverted).
- [x] Make `withLeaseLock` re-entrant within one async context via an `AsyncLocalStorage` set of held lock-file paths, with a comment naming the nested call paths.
- [x] Move `updateItem`'s locate → read → CAS → backward-move → gate → write → activity block inside `withLeaseLock`, leaving argument validation outside and reordering nothing. — `git diff -w` is +56/−1 on store.ts.
- [x] Put `setDoc`'s and `appendScratch`'s CAS + write inside `withLeaseLock`.
- [x] Leave `moveItem`'s `assertMoveAllowed` → `computeOrder` → `updateItem` shape unlocked at the outer level and record why in a code comment (column-wide materialisation must not hold a board-wide lock).
- [x] [pre-review] New test passes and all 417 existing core tests pass unchanged; record the new wall time beside the baseline. — 420 passed, 75.15 s (a repeat run of the same tree took 93.40 s; host variance).
- [x] [pre-review] Confirm no nested path deadlocks: CORE-121 backward-move, renew phase-change, six-store concurrent renewal, CORE-124 batch and `moveItem` position tests all pass. — claims.test.ts 48/48, store.test.ts 85/85.
- [x] [pre-review] Assert no `leases.lock` / `.owner-*` / `.stale-*` residue remains in `.kanmer` after ordinary update/move/setDoc calls.
- [x] [pre-review] Name the production callers that inherit the fix (mcp-server `update_item`/`move_item`/`set_ticket_doc`/`append_scratch`; GUI IPC handlers) — no code change needed in either.
- [x] Update the `AGENTS.md` §8 lease-lock gotcha to state that every ticket-file mutation now runs under `.kanmer/leases.lock`.
- [x] [pre-review] Run the full rail with exact exit codes: `npm test -w @kanmer/core` (0), `node packages/mcp-server/src/smoke.mjs` (0, 306/306), `npm run smoke:protocol` (0, 50/50), `npm run typecheck` (0, after `npm run build` 0), `npm run plugin:check` (0 after `npm run plugin:build`), `npm run verify` (1 — only the known `scripts/antigravity-plugin-config.test.mjs` EBUSY ×2, which fails identically on the unmodified checkout).
- [x] [pre-review] No test weakened, no `apps/gui` edit, no dependency added, no file outside the plan's Expected files table changed. — one addition: `plugins/kanmer/mcp/kanmer-mcp.cjs` had to be rebuilt because the bundle inlines `@kanmer/core` (deviation 2 in the report).
- [x] Commit, push, open the PR with a `Kanmer: CORE-125` footer, write the post-implementation report and move the ticket to Review. — commit 437772d4, PR https://github.com/collisionengineers/kanmer/pull/296.
- [x] [pre-review] Stop at that boundary: no review, merge, verification or closeout.

## Progress notes

- 2026-08-27: three tests added rather than one — the `getBoard` barrier proves the concurrent edit being reverted by the lease write, a second test parks the audited Review → Implementing return on its in-lock `getDoc` and proves the lease record itself being reverted (the direction the ticket names), and a third walks every nested path (`moveItem` → `computeOrder` → `updateItem`, `updateItem` → `appendTransition` → `setDoc`, lease verb → `setDoc`) to prove the re-entrancy guard does not deadlock.
- Lock cost measured with a throwaway benchmark (not committed): 200 sequential `updateItem` calls, 6.08 ms/call before vs 17.34 ms/call after.

---

## Closeout — CORE-125

- [ ] PR merge verified (`gh pr view --json state,mergedAt`)
- [ ] proof.md finalised (PR URL + merge date appended)
- [ ] Moved to final stage
- [ ] Outcome recorded in ticket body (PR link, follow-ups)
- [ ] cd out of worktree; `git worktree remove .worktrees/<id>`
- [ ] `git branch -d <branch>` (`-D` if squash/rebase-merged)
- [ ] `git fetch --prune` + `git worktree prune`
- [ ] `take_ticket action: "release"`

Closeout complete: PR #296 verified MERGED (mergedAt 2026-08-27T23:07:13Z); proof.md finalised with PR URL + merge date appended below its record (frontmatter untouched); ticket already in Done with PASS proof, no stage move needed; Outcome recorded in ticket body; commits updated to include merge SHA c6bbddd617f6c8caef782f43014ccb3dd6a7fdfa alongside head 437772d4; `.worktrees/core-125` and `.worktrees/verify-core-125-c6bbddd617f6c8caef782f43014ccb3dd6a7fdfa` removed (leftover node_modules force-removed, then `git worktree prune`); no stray `.worktrees/core-125-*.log` found; branch `core-125-serialise-ticket-writers` deleted locally (`-D`, squash-merged so `-d` would have refused) and on origin; `git fetch --prune` clean. Releasing claim next.
