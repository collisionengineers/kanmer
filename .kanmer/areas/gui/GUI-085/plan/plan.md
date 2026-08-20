# Plan — GUI-085: deterministic real-Git tests on Windows

## Objective

Keep the GUI's real Git/worktree regression coverage while removing nondeterministic failures caused by Vitest's five-second unit-test budget. Scope the larger budget and fixture hardening only to real-Git tests; do not weaken coverage or hide failures with retries.

## Starting state

- `kanmerGit.test.ts` invokes real Git and filesystem operations.
- The tests inherit Vitest's five-second default.
- Windows process/filesystem latency can exceed that budget intermittently.
- The suite is a prerequisite for safely requiring the Windows `verify` PR check.

## Required changes

### 1. Establish a baseline

1. Read the test file, production helper, GUI/root Vitest configuration, and current test scripts.
2. List every test/helper that spawns Git or creates/removes a repository/worktree.
3. List pure tests that only normalize paths, interpret output, or transform values.
4. Run the target file once with verbose timing on Windows and record the slowest cases in the post-implementation report.
5. Confirm no test performs network access, credential lookup, or calls a real project repository.
6. Inspect existing scratch notes for the originally observed command/timeout.

### 2. Make fixture behavior explicit

7. Reuse the canonical existing test fixture if present; otherwise add one focused test-only helper.
8. Create each mutable fixture under the operating system temporary directory with a unique prefix.
9. Configure repository-local `user.name` and `user.email` before committing.
10. Configure the expected initial branch explicitly rather than relying on global `init.defaultBranch`.
11. Set `GIT_TERMINAL_PROMPT=0` and any canonical no-interaction environment used elsewhere in the repo.
12. Spawn Git directly with executable plus argument array; do not build shell command strings.
13. Capture command, cwd, duration, exit code, stdout, and stderr for failure messages.
14. Await each child process completely and reject on process error/non-zero exit unless the test explicitly expects failure.
15. Register cleanup immediately after fixture creation and run it in `afterEach`/`finally` for success and failure.
16. Remove any registered worktrees cleanly before deleting directories where required by Git.
17. Assert cleanup does not leave child processes or handles that keep Vitest alive.

### 3. Separate pure and real-Git cases

18. Keep pure transformation/parser tests in the normal suite with the default timeout.
19. If production logic is inseparably embedded in subprocess code, extract only a small pure helper when that improves deterministic unit coverage without altering behavior.
20. Group real-Git tests under a clearly named describe block.
21. Define `REAL_GIT_TEST_TIMEOUT_MS = 30_000` next to that block/helper with a comment explaining Windows process/filesystem variability.
22. Apply the timeout only to real-Git tests or their dedicated test project; do not set global `testTimeout` for all GUI tests.
23. Split any monolithic test that performs unrelated Git scenarios so a failure identifies the operation.
24. Keep mutating cases serial. Remove `concurrent` usage or shared mutable fixtures.
25. Share only immutable setup where it demonstrably reduces repeated work without creating order dependence.

### 4. Remove accidental latency

26. Avoid repeated repository setup inside one test when one setup can serve multiple assertions safely.
27. Do not import/start Electron for main-process Git helper tests unless the production module genuinely requires it.
28. Ensure fixture remotes, if any are needed, are local filesystem remotes.
29. Disable/avoid hooks and optional external Git helpers in fixture config.
30. Do not run build/install commands from the test.
31. Replace arbitrary polling/sleep with waiting on the actual child-process/file event.
32. Ensure cleanup is outside assertion timing only where Vitest's lifecycle still awaits and validates cleanup.

### 5. Preserve regression coverage

33. Retain every existing behavioral assertion unless it is a duplicate proven redundant by a named replacement.
34. Preserve Windows path-with-spaces and separator coverage where applicable.
35. Preserve repository status/branch/worktree behavior used by production.
36. Preserve non-zero Git exit/error-surfacing coverage.
37. Add a test that proves fixture behavior is independent of global user identity/default branch.
38. Add a test/teardown assertion that no temporary worktree remains.
39. If the original timeout exposed an unawaited/leaked process, add a direct regression assertion and minimally fix `kanmerGit.ts`; otherwise leave production unchanged.

### 6. Verification

40. Run the target test file ten consecutive times on Windows in one script/loop and record all exit codes and durations.
41. Confirm no run reaches the 30-second bound.
42. Run the complete GUI workspace test suite.
43. Run root `npm test`.
44. Run root `npm run typecheck`.
45. Run root `npm run verify` after CORE-031 is available.
46. Open/use a real PR so the `windows-latest` verify job executes the suite.
47. Confirm the job does not rely on a retry and passes at least twice before CORE-033 branch protection is enabled.
48. Inspect process exit and temporary directories after tests for leaks.
49. Run `git diff --check` and ensure no fixture repository files are tracked.

## Expected files

Normally modify only:

- `apps/gui/src/main/kanmerGit.test.ts`

Optionally modify/add:

- the existing canonical test fixture helper, or `apps/gui/src/main/test/realGitFixture.ts` if none exists;
- `apps/gui/src/main/kanmerGit.ts` only for a proven production race/leak;
- existing package/config files only when required to ensure the canonical rail invokes the tests.

## Acceptance checks

- Real-Git cases have one named, bounded, scoped timeout.
- Pure tests retain the default five-second timeout.
- No retries, sleeps, network, prompts, or global Git settings are used.
- Real-Git cases are isolated and safe from concurrency races.
- Failure output names command/cwd/stdout/stderr/duration.
- Existing behavior coverage remains present.
- Temporary repos/worktrees and child processes are cleaned up.
- Ten consecutive Windows target-file runs pass.
- Full GUI/root verification and the Windows PR job pass.
- Production code is unchanged unless a separately proven race/leak required a minimal fix.

## Verification commands

Use the exact package scripts discovered in the repo. The evidence set must include the equivalent of:

```bash
npm --workspace apps/gui test -- kanmerGit.test.ts
# repeat the canonical target invocation 10 times
npm --workspace apps/gui test
npm test
npm run typecheck
npm run verify
```

Do not invent a script that the root rail never calls.

## Failure and deviation rules

- Stop and update the ticket if the timeout is caused by a production deadlock rather than ordinary latency.
- Stop if tests touch the real Kanmer board/repository; convert them to disposable local fixtures before continuing.
- Do not raise the global timeout as the first fix.
- Do not add retries, sleeps, skips, or mock-only replacement coverage.
- Do not change branch-protection settings in this ticket.
- Do not merge; hand the PR to independent review.

## Stop condition

Stop when the target suite has deterministic isolated fixtures, only real-Git cases receive a bounded scoped timeout, ten consecutive Windows runs plus the complete verification rail are green, no process/worktree/temp leak remains, and the PR is ready for review. Do not merge or begin branch-protection operations.
