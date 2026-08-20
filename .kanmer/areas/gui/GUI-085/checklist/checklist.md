# Checklist — GUI-085

## Inspect and measure

- [ ] Read `kanmerGit.test.ts`, `kanmerGit.ts`, Vitest configs, and test scripts.
- [ ] Enumerate every real-Git test/helper.
- [ ] Enumerate pure tests.
- [ ] Confirm all Git operations are local-only.
- [ ] Capture baseline per-test durations on Windows.
- [ ] Read existing ticket scratch evidence.

## Fixture hardening

- [ ] Reuse one canonical fixture implementation.
- [ ] Use unique OS-temp directories.
- [ ] Configure local Git user name/email.
- [ ] Configure initial branch explicitly.
- [ ] Disable terminal prompts.
- [ ] Spawn Git with argument arrays.
- [ ] Capture command/cwd/duration/stdout/stderr.
- [ ] Await every child process.
- [ ] Guarantee cleanup on success and failure.
- [ ] Remove registered worktrees before directory deletion where necessary.
- [ ] Confirm no leaked process/handle.

## Timeout scope

- [ ] Define `REAL_GIT_TEST_TIMEOUT_MS` once.
- [ ] Set it to a bounded initial 30,000 ms.
- [ ] Apply it only to real-Git tests/dedicated integration project.
- [ ] Keep pure tests on default timeout.
- [ ] Keep root/global Vitest timeout unchanged.
- [ ] Remove unsafe concurrency from mutating Git cases.
- [ ] Split monolithic slow tests into diagnosable cases.

## Coverage

- [ ] Preserve all distinct existing assertions.
- [ ] Preserve branch/status/worktree behavior.
- [ ] Preserve Windows paths/spaces/separator cases.
- [ ] Preserve non-zero Git error behavior.
- [ ] Prove independence from global Git config.
- [ ] Prove fixture/worktree cleanup.
- [ ] Modify production code only if a race/leak is reproduced and tested.

## Verification

- [ ] Run the target file ten consecutive times on Windows.
- [ ] Record durations and confirm none reaches timeout.
- [ ] Run the complete GUI test suite.
- [ ] Run root `npm test`.
- [ ] Run root `npm run typecheck`.
- [ ] Run root `npm run verify`.
- [ ] Run the Windows PR job at least twice successfully before protection rollout.
- [ ] Confirm no retry/sleep/skip was added.
- [ ] Confirm no temp repositories/worktrees remain.
- [ ] Run `git diff --check`.
- [ ] Record evidence in post-implementation report.
- [ ] Stop before merge.
