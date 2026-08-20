# Research — GUI-085 Windows Git test timeouts

## Problem characterization

`kanmerGit.test.ts` exercises real Git repositories through child processes. Vitest's default five-second test timeout is appropriate for pure unit tests but is not a reliable budget for multiple filesystem operations, process creation, repository initialization, commits, and worktree commands on Windows. Process startup, Defender/antivirus scanning, NTFS metadata updates, and temporary-directory cleanup can add variable latency even when the production code is correct.

The defect is the test contract, not evidence that production Git operations should be removed or mocked. These tests protect Windows-specific behavior that the product depends on, so replacing the entire suite with mocks would hide the class of failures it is meant to catch.

## Recommended design

Use two layers:

1. **Pure tests** for any path normalization, status interpretation, command-result parsing, and decision logic. These retain the normal five-second budget and do not spawn Git.
2. **Real-Git integration tests** for repository/worktree behavior. Mark them explicitly, run them serially, and give each or the enclosing suite a bounded platform-appropriate timeout.

A 20–30 second per-test upper bound is preferable to an unlimited/global timeout. The exact value should be derived from the slowest clean Windows CI run with margin; start at 30 seconds for real-Git tests and keep the root Vitest default unchanged.

## Sources of avoidable latency

- Re-running `git init`, user configuration, initial commit, and worktree setup for every assertion.
- Invoking a shell instead of spawning Git directly with an argument array.
- Waiting for credential/network behavior accidentally; all tests must use local repositories and local refs only.
- Running mutating real-Git cases concurrently against shared paths.
- Performing cleanup inside the timed assertion when cleanup itself is variable.
- Rebuilding application code or importing Electron unnecessarily in a main-process Git unit.

Where test independence permits, create one immutable fixture repository in `beforeAll`, then clone/copy or create per-test worktrees from it. Where a test mutates branch/worktree state, keep a per-test temporary repository to prevent order dependence. Do not share a mutable repository merely to gain speed.

## Determinism requirements

- Set `user.name`, `user.email`, default branch, and line-ending behavior locally in the fixture; never depend on developer global Git config.
- Set explicit environment values such as `GIT_TERMINAL_PROMPT=0` and disable optional hooks/config that could invoke external programs.
- Use absolute normalized temp paths and quote only through argument arrays.
- Await every child process and filesystem cleanup.
- Capture stdout, stderr, command arguments, duration, and fixture path in assertion failures.
- Do not use arbitrary sleeps or retry until green. A retry can conceal a race and is not a fix.
- Keep cases serial unless each has a completely independent repository and concurrency is proven safe.

## Timeout placement

Prefer a named constant such as `REAL_GIT_TEST_TIMEOUT_MS = 30_000` beside the test helper and pass it only to tests/describes that execute Git. Avoid changing the whole GUI Vitest configuration unless measurement proves every test in a dedicated integration project needs the same budget.

If the existing suite already has a test helper, extend it rather than adding a second repository-fixture implementation. If a single test contains many independent Git scenarios, split it so a timeout identifies the slow operation rather than timing a monolith.

## Verification strategy

- Run the file repeatedly on Windows (minimum ten consecutive runs) with no failures.
- Run the full GUI test suite to prove no global timeout or leaked process affects other tests.
- Run under the root verification rail and the Windows GitHub Actions job.
- Add duration diagnostics or a deliberately slow fake-process test only if needed to prove the scoped timeout applies; do not make CI wait 30 seconds.
- Confirm temporary repositories and worktrees are removed after success and failure.

## Non-goals

- No production behavior change unless a real process leak/race is demonstrated separately.
- No global unlimited timeout.
- No test retries, sleeps, or skipped Windows coverage.
- No conversion of all Git behavior to mocks.
- No network or GitHub access in tests.
