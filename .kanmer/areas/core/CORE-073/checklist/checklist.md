- [x] Bind retry to the open board root.
- [x] Refuse mismatched roots without mutating store/watcher state.
- [x] Add deterministic regression and run rails.

Implementation notes: added bindRetryBoardStatus in apps/gui/src/main/syncBranch.ts and used it from syncProject in apps/gui/src/main/index.ts. Matching roots are accepted; unavailable or mismatched results remain paused on the context root. Focused syncBranch rail passed 5/5. Full GUI rail exited 1 on the known stale shared-core antigravity baseline (45 files, 304/305 tests; 3 suites failed to collect plus 1 baseline dispatch assertion). Core build passed; scripts passed 88/88; GUI typecheck hit the same stale core dispatch-provider errors.

---

## Closeout — CORE-073

- [ ] PR merge verified
- [ ] proof.md finalised with PR URL and merge date
- [ ] Moved to final stage
- [ ] Outcome recorded in ticket body
- [ ] Recorded worktree removed
- [ ] Recorded branch deleted
- [ ] git fetch --prune and worktree prune
- [ ] take_ticket release
