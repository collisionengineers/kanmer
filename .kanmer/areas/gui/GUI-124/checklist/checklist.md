# Checklist — GUI-124

- [x] [pre-review] Trace `restoreTabs`, `openProject`, and the existing renderer advisory/log mechanisms; choose the smallest user-visible surface consistent with current patterns.
- [x] [pre-review] Refactor the restore loop so each failure is reported while later tabs continue, without changing session persistence semantics.
- [x] [pre-review] Add a focused regression test for one failed background restore plus one successful restore, asserting the advisory/log call and surviving tab.
- [x] [pre-review] Run focused GUI tests, full GUI tests/typecheck as practical, and the relevant build rail; inspect the diff and write the post-implementation report before Review.
- [x] [pre-review] Name the production caller and prove the restored-tab failure is observable without blocking other restores.
- [x] [pre-review] Stop at the approved boundary; do not merge or start another ticket.

## Progress notes

Execution packet checklist was absent; this checklist mirrors the approved plan and files acceptance evidence.

Focused session test passed 3/3. Full GUI tests, typecheck, and build were attempted and retained as INCONCLUSIVE due unrelated origin/main provider/core integration failures; details are in scratch and the post-implementation report.

---

## Closeout — GUI-124

- [x] PR merge verified (PR #226 MERGED as 181b6475208a2f18eaeeaa0a9beb44c0c786ae4f)
- [x] proof.md finalised (merged-main checks recorded)
- [x] Moved to final stage (Verifying → Done)
- [x] Outcome recorded in ticket body (PR link, no follow-ups)
- [ ] cd out of worktree; remove recorded GUI-124 worktree
- [ ] Delete merged GUI-124 branch
- [ ] Fetch/prune worktrees
- [ ] take_ticket action: release
