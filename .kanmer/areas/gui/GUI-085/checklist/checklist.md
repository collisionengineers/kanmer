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
- Deferred evidence: command/cwd/duration/stdout/stderr capture was not added because the helper was intentionally unchanged and the timeout fix required no diagnostics change.
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
- Deferred evidence: no independent path-with-spaces assertion exists in the pre-existing suite; no coverage was removed.
- [x] Preserve non-zero Git error behavior.
- [x] Prove independence from global Git config.
- [x] Prove fixture/worktree cleanup.
- [x] Modify production code only if a race/leak is reproduced and tested: no race/leak was reproduced, so production code remains unchanged.

## Verification

- [x] Run the target file ten consecutive times on Windows.
- [x] Record durations and confirm none reaches timeout.
- [x] Run the complete GUI test suite.
- Deferred rail: no complete root `npm test` terminal result was captured in this execution; GUI and script/core component rails passed.
- Deferred rail: root typecheck was blocked by the pre-existing UI demo fixture error; GUI typecheck passed.
- Deferred rail: current main had no `verify` script (CORE-031 prerequisite absent).
- Deferred rail: the Windows PR job is external CI evidence and was pending PR #88 at closeout.
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

---

## Closeout — GUI-085

- [x] PR merge verified (`gh pr view --json state,mergedAt`)
- [x] proof.md finalised (PR URL + merge date appended)
- [x] Moved to final stage
- [x] Outcome recorded in ticket body (PR link, follow-ups)
- [x] cd out of worktree; `git worktree remove .worktrees/gui-085`
- [x] `git branch -d gui-085-deterministic-real-git-tests` (`-D` if squash/rebase-merged)
- [x] `git fetch --prune` + `git worktree prune`
- [x] `take_ticket action: "release"`
