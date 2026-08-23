# Checklist — GUI-124

- [ ] [pre-review] Trace `restoreTabs`, `openProject`, and the existing renderer advisory/log mechanisms; choose the smallest user-visible surface consistent with current patterns.
- [ ] [pre-review] Refactor the restore loop so each failure is reported while later tabs continue, without changing session persistence semantics.
- [ ] [pre-review] Add a focused regression test for one failed background restore plus one successful restore, asserting the advisory/log call and surviving tab.
- [ ] [pre-review] Run focused GUI tests, full GUI tests/typecheck as practical, and the relevant build rail; inspect the diff and write the post-implementation report before Review.
- [ ] [pre-review] Name the production caller and prove the restored-tab failure is observable without blocking other restores.
- [ ] [pre-review] Stop at the approved boundary; do not merge or start another ticket.

## Progress notes

Execution packet checklist was absent; this checklist mirrors the approved plan and files acceptance evidence.
