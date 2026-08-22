## Independent review — CORE-055 / PR #177

### Changes

At exact head `3964c2ca370c82491474a38f813f30df7fdc9aea`, the three-file GUI diff adds `shouldAttemptOrdinaryBranchRename` in `kanmerGit.ts`, requires that predicate in `applyGitPreferences` before any ordinary rename, and extends the real-Git integration test with a cached-branch/saved-preference mismatch asserting no ref or worktree mutation. The protected refusal predicate remains guarded separately. No provider, core-store, board, or plugin behavior changed.

### Checks

- PASS exit 0: `npm run test -w @kanmer/gui -- --run src/main/kanmerGit.test.ts` — 20/20 tests (the real-Git suite completed in 91.11s).
- PASS exit 0: `npm run build:core`.
- PASS exit 0: `npm run test:scripts` — 89/89.
- PASS exit 0: `npm run check:manual` (22 chapters), `npm run verify:docs`, and `git diff --check`.
- The author's broad GUI/typecheck/build failures are preserved as the unrelated shared-dispatch `antigravity` baseline; no touched-suite failure was observed.

### Governing-doc and report review

FRD-020 requires mismatch observation to pause automatic sync without implicit repair; ADR-0016 requires the GUI to fail closed until an administrator handoff is proven. The new predicate enforces both requirements for the ordinary and protected rename paths, and the report/files/plan match the three-file diff and parked live GitHub-protection boundary.

### Dispositions

- Ordinary rename on branch mismatch — fixed in PR and covered by the real-Git no-mutation regression.
- Protected refusal path — retained from CORE-054 and rechecked in the exact diff; no new issue.
- Live GitHub protection retargeting and packaged GUI interaction — accepted as explicit INCONCLUSIVE evidence boundaries in the packet; no claim is made and no new ticket is warranted.

### Verdict

PASS — independent review at exact PR head. Merge non-squash into `core-054-no-rename-mismatch` is authorized; then move CORE-055 to Verifying. Do not verify or clean up in this review step.
