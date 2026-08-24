# GUI-130 research — Windows full-rail GUI sync test isolation

## Question

Why can `apps/gui/src/main/index.sync.test.ts` complete all 11 cases when it is run alone, yet encounter a finite Vitest hook timeout during the Windows `npm run verify` rail, and what is the smallest deterministic test-runner change that preserves its assertions and bounds?

## Evidence captured before this ticket

- At GUI-129 commit `49807c28a6a3e371bc2793a1ef8c10db63363d92`, a clean normal-clone `npm run verify` run completed the core suite (310/310) and then reported one GUI failure in `src/main/index.sync.test.ts`: the provider-registration/reopen case took 10.757 seconds and Vitest reported a hook timeout at its 10-second bound. The process later required interruption after the failure, so this is retained as a failed/incomplete full-rail result, not a pass.
- The same sync suite run directly in the GUI-129 isolated worktree completed 11/11 with exit 0 in 102.73 seconds (the suite reported 94.861 seconds). Its individual tests retain their existing 30-second bounds. This proves the suite is not intrinsically unable to finish, but does not erase the failed full-rail evidence.
- The captured failure identifies a hook timeout but not the precise hook. The ticket body called it `afterEach`; the source now gives the cleanup `afterEach` an explicit 30-second bound, while the real-Git `beforeEach` has no local override and therefore uses Vitest's 10-second default. A later execution run must record the exact hook rather than assuming its type.

## Code and runner findings

- `apps/gui/src/main/index.sync.test.ts` uses real Git repositories for every case. Its `beforeEach` removes a fixed Electron user-data fixture directory, creates temporary bare and working repositories, configures Git, commits fixture data, and pushes it. Its `afterEach` clears a sync timer, deletes the test context, then uses asynchronous recursive removal with 20 finite retries and a 100ms delay.
- Each of the long production-retry cases has a 30-second test bound. Commit `28ea4782` intentionally gave cleanup its own finite 30-second bound and an assertion that the fixture directory is gone. GUI-130 must preserve those choices; increasing timeouts or weakening assertions would hide the observed scheduling issue.
- `apps/gui/package.json` has no Vitest configuration and its only test command is `vitest run`. Vitest documents `--fileParallelism` (enabled by default) and the supported `--no-file-parallelism` form. Its default hook timeout is 10 seconds.
- The full rail invokes the GUI package test command alongside a large multi-workspace test workload, whereas the successful evidence invoked only the sync file. That makes cross-file scheduling pressure a supported, package-local candidate cause. It is a hypothesis to prove with the full-rail verification; no source change has been made during research.

## Related work and boundaries

- [[GUI-128]] fixed an independent missing `Notification.isSupported()` test mock. Its later GUI evidence was green; it is not a reason to suppress or alter this timeout.
- [[GUI-129]] is limited to atomic Windows settings rename retry and its related tests. It has a preserved red full-rail result and receives no further source changes from this ticket.
- [[CORE-095]] investigates core-package Vitest isolation on protected Windows runners. GUI-130 must remain package-scoped: it neither changes root scheduling nor modifies core scripts or assertions.
- The governing reference is `docs/functional/frd/FRD-019-gui-shell.md`; deterministic GUI integration coverage supports its reliable project-shell behavior without changing production behavior.

## Decision

Use the GUI package's supported file-scheduling control as the candidate remediation: serialize GUI test files through its existing `test` script, while retaining Vitest's existing finite per-test and per-hook limits. Limit implementation to that script and the contributor command documentation required by the repository convention. Do not alter `index.sync.test.ts`, assertions, fixture behavior, retries, or timeout values.

## Execution evidence required

1. Preserve the existing failed normal-clone full-rail output as failure evidence.
2. Run the changed GUI package test command in an isolated ticket worktree using an explicit absolute `npm --prefix` path.
3. Run the authoritative root verification in a clean normal clone using an explicit absolute `npm --prefix` path, and record exit codes and relevant output paths.
4. Treat any timeout, hang, or non-zero exit as a failure/inconclusive result; do not weaken the test to obtain a pass.
