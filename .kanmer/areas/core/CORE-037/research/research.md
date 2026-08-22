# Research — CORE-037: Windows temporary-path identity in Git integration tests

## Question

Why does the real-Git GUI integration test compare unequal strings for the same Windows temporary worktree, and what narrow test-side normalization preserves genuine path/refs assertions while removing the `RUNNER~1` versus `runneradmin` false negative?

## Findings

- The ticket body and dependency review records identify the failing assertion as the path comparison in `apps/gui/src/main/kanmerGit.test.ts`; GitHub `windows-latest` returned equivalent `C:\Users\RUNNER~1\...` and `C:\Users\runneradmin\...` spellings. CORE-032 proof records the real PR check failure; GUI-075 and SKILL-021 review attestations defer their blocker to CORE-037.
- `apps/gui/src/main/kanmerGit.test.ts:93,193,213` compares `resolve(...)` results for existing worktree paths. `resolve` is lexical path joining/normalization; it does not resolve Windows 8.3 aliases or filesystem identity. The production helper `ensureBoardWorktree` returns `resolve(attached)` for Git's porcelain path and `resolve(boardRoot)` for the configured path, so equivalent spellings can cross the API boundary without representing different worktrees.
- The test file deliberately exercises real Git worktrees/remotes and sets a 30-second per-test budget (`apps/gui/src/main/kanmerGit.test.ts:10-15,27-30`). Replacing Git calls with mocks or weakening equality would lose the behavior this remediation exists to protect.
- A baseline local run of `npm test -w @kanmer/gui -- src/main/kanmerGit.test.ts --run` completed with 12 tests: 11 passed and 1 failed in the existing `refuses a name that is already taken` case because the `afterEach` hook timed out and cleanup raised Windows `EPERM`. It did not reproduce the CI alias assertion locally; that failure remains a preserved external baseline.
- FRD-020 R1/R5 requires the board worktree path to remain stable while branch/refs operations remain real. The linked FRD does not authorize changing production path reporting for this test-only remediation.

## Implications

- Add one test-local `pathIdentity` helper that uses native filesystem realpath for existing paths on Windows and falls back to lexical `resolve` when a path does not exist or when running on non-Windows. Apply it only to comparisons of existing worktree identities (the three assertions above), leaving missing-path expectations and all Git/ref assertions unchanged.
- Native realpath canonicalizes equivalent short/long Windows path spellings while still distinguishing genuinely different locations. The helper must not change `kanmerGit.ts`, production API values, worktree creation, branch/ref assertions, cleanup behavior, or test timeouts.
- Verification must include the focused real-Git test, GUI suite/typecheck/build, and the shared rail as proportionate. The existing local cleanup `EPERM`/timeout and any CI result must remain recorded rather than relabelled.

## Open questions

- None requiring operator input. The implementation uses the narrow test-side native-realpath identity rule described above; any broader cleanup flake is outside CORE-037.
