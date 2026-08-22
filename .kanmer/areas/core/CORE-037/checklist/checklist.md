# Checklist — CORE-037

- [x] Add the test-local native/lexical `pathIdentity` helper without changing production code.
- [x] Apply `pathIdentity` only to the three existing-worktree path identity assertions; retain all real Git, branch, ref, and missing-path assertions.
- [x] Run the focused `kanmerGit.test.ts` suite and record the exit/count plus any baseline cleanup EPERM or hook timeout.
- [ ] Run the full GUI suite, GUI typecheck, GUI build, and `git diff --check`; preserve every non-zero baseline result.
- [ ] Run the shared verification rail where proportionate and record any existing CI/path-alias or migration failures without relabelling them.
- [ ] Write/read back the post-implementation report and this checklist, commit only CORE-037 scope, push/open the PR, and move to Review after fresh gates.

## Progress notes

- 2026-08-22 — Baseline focused GUI Git integration run: 12 tests, 11 passed, 1 failed because `renameBoardBranch > refuses a name that is already taken` exceeded the 10s hook timeout and cleanup raised Windows EPERM. The known GitHub `RUNNER~1` versus `runneradmin` alias failure was not reproduced locally; both boundaries remain preserved for later evidence.
- 2026-08-22 — Implemented the test-only `pathIdentity` helper using Windows `realpathSync.native` with ENOENT/ENOTDIR lexical fallback; changed only the three existing-worktree path identity comparisons. Focused rerun: 12/12 tests passed, exit 0; no source or production path changes.
