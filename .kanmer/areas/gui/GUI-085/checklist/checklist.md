# Checklist — GUI-085

## Inspect and measure

- [x] Read `kanmerGit.test.ts`, `kanmerGit.ts`, Vitest configs, and test scripts.
- [x] Enumerate every real-Git test/helper.
- [x] Enumerate pure tests: none are in this file; all 12 cases are real-Git integration tests.
- [x] Confirm all Git operations are local-only.
- [x] Capture baseline per-test durations on Windows.
- [x] Read existing ticket scratch evidence.

## Fixture hardening

- [x] Reuse one canonical fixture implementation.
- [x] Use unique OS-temp directories.
- [x] Configure local Git user name/email.
- [x] Configure initial branch explicitly.
- [x] Disable terminal prompts.
- [x] Spawn Git with argument arrays.
- [ ] Capture command/cwd/duration/stdout/stderr: existing helper remains intentionally unchanged; no production/test failure-diagnostics change was needed for the timeout fix.
- [x] Await every child process.
- [x] Guarantee cleanup on success and failure.
- [x] Remove registered worktrees before directory deletion where necessary.
- [x] Confirm no leaked process/handle.

## Timeout scope

- [x] Define `REAL_GIT_TEST_TIMEOUT_MS` once.
- [x] Set it to a bounded initial 30,000 ms.
- [x] Apply it only to real-Git tests/dedicated integration project.
- [x] Keep pure tests on default timeout.
- [x] Keep root/global Vitest timeout unchanged.
- [x] Remove unsafe concurrency from mutating Git cases.
- [x] Split monolithic slow tests into diagnosable cases.

## Coverage

- [x] Preserve all distinct existing assertions.
- [x] Preserve branch/status/worktree behavior.
- [ ] Preserve Windows paths/spaces/separator cases: the existing suite has no independently identified path-with-spaces assertion to claim; no coverage was removed.
- [x] Preserve non-zero Git error behavior.
- [x] Prove independence from global Git config.
- [x] Prove fixture/worktree cleanup.
- [x] Modify production code only if a race/leak is reproduced and tested: no race/leak was reproduced, so production code remains unchanged.

## Verification

- [x] Run the target file ten consecutive times on Windows.
- [x] Record durations and confirm none reaches timeout.
- [x] Run the complete GUI test suite.
- [ ] Run root `npm test`: GUI and script/core component rails were run, but no complete root-run terminal result was captured in this execution.
- [ ] Run root `npm run typecheck`: blocked by the pre-existing `packages/ui/src/demo.tsx` missing `TicketDocsInfo.documentPaths` fixture; GUI typecheck passed.
- [ ] Run root `npm run verify`: current main has no `verify` script (CORE-031 prerequisite absent).
- [ ] Run the Windows PR job at least twice successfully before protection rollout: external GitHub Actions evidence pending PR #88.
- [x] Confirm no retry/sleep/skip was added.
- [x] Confirm no temp repositories/worktrees remain.
- [x] Run `git diff --check`.
- [x] Record evidence in post-implementation report.
- [x] Stop before merge.

## Progress notes

- Implemented and committed only `apps/gui/src/main/kanmerGit.test.ts` at `43d5fb3`; PR [#88](https://github.com/collisionengineers/kanmer/pull/88) is open and unmerged.
- Ten serial target runs passed (120/120 tests). The slowest observed case was 4.43 s; under a complete serial GUI run it was 13.277 s, below the scoped 30 s bound.
- Complete GUI suite passed: 29 files / 296 tests. GUI typecheck and `git diff --check` passed.
- Remaining unchecked items are either intentionally unimplemented diagnostics/coverage claims or externally unavailable rails: root typecheck's known unrelated UI demo failure, absent `npm run verify`, and pending Windows PR runs. No source change was made during this checklist reconciliation.
