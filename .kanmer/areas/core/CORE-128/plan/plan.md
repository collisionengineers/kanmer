# Plan — CORE-128: Quarantine or fix the recurring Windows core-test timing failures that block verification

*The plan. Not the checklist — reasoning establishes bounded work; the checklist distils it into independently observable actions.*

## Objective

Make `npm run verify` deterministic on Windows under concurrent load by fixing the three
reproduced causes of the recurring failure family, without weakening a single assertion.

## Starting state

Branch `core-128-windows-test-timing` off `origin/main` `0f4a21fe`, worktree
`.worktrees/core-128`. Full evidence in `scratch/research.md`; the surface in `files`.

**Reproduction (validated on this host, 8 logical CPUs, ~2.7 GB free):**

```
node %TEMP%\core128\hog.mjs 400   # x4-8, each: 40x4 KB writes + reads + sha256 + rmSync, looping
cd packages/core && npx vitest run                 # file parallelism ON  -> fails first try
cd <repo> && npm test                              # the real rail       -> fails within 1-2 runs
```

The load generator is CPU + temp-volume churn on the volume the suites use. A second
verification rail in another worktree is an equivalent, and more realistic, load source.

**Three confirmed causes.**

1. *Timing.* `packages/core` has no vitest config, so vitest's **5 s default `testTimeout`**
   applies. Under load the observed slowest tests reach 5.1-6.2 s and fail with
   `Test timed out in 5000ms` — `docs.test.ts > the shipped profile gate matrix > chore: …`
   and two `claims.test.ts > batch workspaces (CORE-124)` cases, all named or adjacent members
   of the ticket. The budget is provably too tight: CORE-125's board write lock spends up to
   **2 145 ms** (`DEFAULT_LOCK_RETRY_MS`) before a contended claim gives up, and the **first**
   locked write in a process pays `defaultProcessIdentity()`'s synchronous
   `execFileSync("powershell.exe", …)` — measured **776 ms** (self, then cached) and
   **1 103 ms** (foreign pid, never cached); `store.updateItem()` measured **998 ms** first call
   vs **25.9 ms** steady state. Vitest's default `isolate: true` resets that cache per test
   *file*, so each file pays it again. 2 145 + ~1 000 ms is 63 % of the 5 s budget before any
   assertion runs.
2. *Teardown races.* Every temp-root teardown is `fs.rm(dir, { recursive: true, force: true })`.
   Node's recursive `rm` **does** retry `EBUSY`/`EMFILE`/`ENFILE`/`ENOTEMPTY`/`EPERM`, but only
   when `maxRetries > 0`, and the default is `0`. Reproduced as
   `ENOTEMPTY: directory not empty, rmdir '…\kanmer-claims-*\.kanmer'` and
   `…\kanmer-docs-*\.kanmer`. `packages/core/src/io.test.ts:13` already passes `maxRetries: 3` —
   the correct pattern was found once and never shared.
3. *Environment, not load.* `scripts/antigravity-plugin-config.test.mjs`'s two `cmd.exe` tests
   fail **6/6 under load and 1/1 with no load at all** with
   `'kanmer-mcp.cmd' is not recognized as an internal or external command`. The agent harness
   sets `NoDefaultCurrentDirectoryInExePath=1` in the process environment (Process scope only;
   `User` and `Machine` are empty), the test forwards `{ ...process.env, LOCALAPPDATA }` to its
   child, and cmd then removes the current directory from its command search path — so the
   shipped `pushd !LOCALAPPDATA!\Kanmer\bin&&call kanmer-mcp.cmd` token cannot resolve the shim
   it just wrote. This is why the hosted runner is green on these two while every agent-driven
   `npm run verify` is red. The ticket recorded them as `EBUSY rmdir …\Kanmer Test Space\Kanmer\bin`,
   which is a *second*, separate race in the same `finally`: `bin` is the just-exited `cmd.exe`'s
   working directory.

## Governing docs

- **`docs/functional/frd/FRD-035-golden-board-and-candidate-promotion-safety.md` — Meets.**
  FRD-035 AC1 requires golden fixtures that "retain exact command evidence and terminal result",
  and AC5 requires required CI and Kanmer gates to be green for a promotion record. Both are
  unattainable while the shared rail returns a non-deterministic terminal result: a red
  `npm run verify` currently carries no information about whether the candidate is sound, which
  is precisely the judgement FRD-035 wants mechanical. This ticket removes the non-determinism
  from the rail; it changes no board behaviour, no contract and no acceptance criterion, so the
  FRD text is unmodified.
- No other PRD/FRD/ADR is linked, none is modified, and no new ADR is required: nothing here is
  a design decision about product behaviour. The one candidate design question — replacing the
  lock's PowerShell process-identity probe — is explicitly out of scope below.

## Required changes

1. **`packages/core/src/io.ts`** gains one exported helper beside `renameWithRetry`:

   ```ts
   export async function removeTreeWithRetry(target: string): Promise<void>
   ```

   It calls `fs.rm(target, { recursive: true, force: true, maxRetries: …, retryDelay: … })` and
   carries a doc comment naming the Windows behaviour: a deletion whose file still has an open
   handle (a scanner, an indexer, or a child process whose working directory it was) leaves the
   directory transiently non-empty, so `rmdir` raises `ENOTEMPTY`/`EBUSY` rather than failing
   permanently. Retry budget is bounded and named in the comment; `force: true` keeps a missing
   target a no-op, exactly as today. It is a public core export because `packages/mcp-server`,
   `apps/gui` and `scripts` all need it and `@kanmer/core` is the only typed module all four can
   import (see `files` — `apps/gui/tsconfig.node.json` is `composite` and typechecks its tests).

2. **`packages/core/vitest.config.ts`** (new) sets `testTimeout` and `hookTimeout` to **30 s**,
   with a comment that sizes it explicitly: 2 145 ms of lock-acquisition retry budget plus a
   ~1 s (much more under load) PowerShell process-identity probe on the first locked write in
   each test file, on top of Windows filesystem work — against a measured worst *unloaded*
   test of 1.63 s and worst *loaded* test of 6.2 s. `--no-file-parallelism` in
   `packages/core/package.json` is unchanged; it is the rail's real configuration.

3. **Temp-tree teardowns route through the helper.** Every recursive removal of an OS temp
   directory in a test file under `packages/core`, `packages/mcp-server`, `scripts` and
   `apps/gui` becomes `await removeTreeWithRetry(dir)` (or its sync-context equivalent where a
   test is synchronous). No other behaviour changes.

4. **`packages/mcp-server/src/http.test.mjs`**: raise the `spawnSync(process.execPath, …)`
   `timeout` from `2_000` with a comment naming that the child boots a fresh Node process and
   imports `dist/http.js` before it can answer, which exceeds 2 s of cold module load on a
   contended Windows host. Assertions unchanged.

5. **`packages/mcp-server/src/tunnels/readiness.test.mjs`**: raise the "delayed local success"
   case's `timeoutMs: 1_000` with a comment naming that it is a wall-clock budget spent partly
   on a deliberate 150 ms server delay. `assert.equal(attempts, 2)` and the
   deadline-not-coupled-to-polling claim are unchanged. The two cases that *assert*
   `TUNNEL_READINESS_TIMEOUT` (`timeoutMs: 5`) are untouched — shortening is their point.

6. **`scripts/antigravity-plugin-config.test.mjs`**: build the child environment so that
   `NoDefaultCurrentDirectoryInExePath` is **deleted** from it, with a comment naming the
   variable and that cmd drops the current directory from its search path while it is defined —
   which is a property of the harness that launched the test, not of the launcher token under
   test. Both tests keep every existing assertion. Route the `finally` removals through the
   helper for the `EBUSY …\bin` race. If, after that, the shim still cannot be spawned, the test
   records a `skip` naming the reason — a silent pass is not acceptable.

7. **`AGENTS.md` §8**: one new numbered gotcha covering all three causes and the rule that new
   tests use `removeTreeWithRetry` rather than a bare recursive `fs.rm`.

8. **`plugins/kanmer/mcp/kanmer-mcp.cjs`**: regenerated, because `io.ts` changed.

## Expected files

| Action | Repo-root-relative path | Responsibility |
|---|---|---|
| Modify | `packages/core/src/io.ts` | Adds `removeTreeWithRetry`; compiled into the committed plugin bundle. |
| Add | `packages/core/vitest.config.ts` | `testTimeout`/`hookTimeout` with the sizing comment. |
| Modify | `packages/core/src/store.test.ts` | Temp-root teardown via the helper. |
| Modify | `packages/core/src/claims.test.ts` | Reproduced `ENOTEMPTY` and 5 s timeouts. |
| Modify | `packages/core/src/docs.test.ts` | Reproduced `ENOTEMPTY` and a 5 s timeout. |
| Modify | `packages/core/src/migrate.test.ts` | Named member. |
| Modify | `packages/core/src/io.test.ts` | Replaces its local `maxRetries: 3` with the shared helper. |
| Modify | `packages/core/src/project.test.ts` | Temp-root teardown. |
| Modify | `packages/core/src/board.test.ts` | Temp-root teardown. |
| Modify | `packages/core/src/merge-gate.test.ts` | Temp-root teardown. |
| Modify | `packages/core/src/sources.test.ts` | Temp-root teardown. |
| Modify | `packages/core/src/staleness.test.ts` | Temp-root teardown (sync context). |
| Modify | `packages/core/src/dispatch-supervisor.test.ts` | Temp-root teardown. |
| Modify | `packages/mcp-server/src/http.test.mjs` | `spawnSync` timeout + teardown. |
| Modify | `packages/mcp-server/src/tunnels/readiness.test.mjs` | Readiness wall-clock budget. |
| Modify | `packages/mcp-server/src/**/*.test.mjs` (remaining temp-root removals) | Teardown via the helper. |
| Modify | `scripts/antigravity-plugin-config.test.mjs` | Child env + teardown; the two named `EBUSY` tests. |
| Modify | `scripts/*.test.mjs` (remaining temp-root removals) | Teardown via the helper. |
| Modify | `apps/gui/src/main/**/*.test.ts` (temp-root removals) | Teardown via the helper, imported from `@kanmer/core`. |
| Modify | `AGENTS.md` | New §8 gotcha. |
| Modify | `plugins/kanmer/mcp/kanmer-mcp.cjs` | **Committed generated artifact** — `npm run plugin:build`. |
| Inspect | `packages/core/src/store.ts` | Confirms `withLeaseLock` passes no lock options, so the default identity probe applies. |
| Inspect | `scripts/verify.mjs` | The authoritative rail this ticket must make deterministic. |

## Do not modify

- `packages/core/src/io.ts`'s lock implementation: `DEFAULT_LOCK_RETRY_MS`,
  `DEFAULT_LOCK_STALE_MS`, `defaultProcessIdentity`, `withExclusiveFileLock`,
  `recoverStaleLock` or the lock record format. The identity probe is the dominant cost, but
  changing it changes what two processes compare to detect PID reuse (AGENTS.md §8 gotcha 17).
- `plugins/kanmer/mcp_config.json` and `apps/gui/build/kanmer-mcp.cmd` — the Antigravity
  launcher token and shim (AGENTS.md §8 gotcha 13).
- `packages/core/package.json`'s `--no-file-parallelism`, and `scripts/verify.mjs`'s
  `VERIFY_STEPS`.
- Any `expect(…)`/`assert(…)` body. No `.skip`, `.todo`, `.only`, no removed case, no loosened
  matcher — with the single exception of the documented, reason-carrying skip in change 6, which
  the ticket authorises and which must name why the shim could not be spawned.
- `.github/workflows/**`.

## Constraints

- **Windows-first.** The retry budgets and timeouts are sized against measurements taken on this
  host and recorded in `scratch/research.md`; every one of them carries a comment naming the
  behaviour it accommodates.
- **Generated artifact.** `plugin:check` compares the committed bundle's bytes against a fresh
  build and refuses in a checkout that does not own its `@kanmer/core` resolution, so
  `npm install` in `.worktrees/core-128` is a prerequisite for `plugin:build`/`plugin:check`
  being meaningful there (AGENTS.md §8 gotcha 8).
- **Build before typecheck.** A new `@kanmer/core` export is invisible to `apps/gui` and
  `packages/mcp-server` until `npm run build` runs.
- **No new dependency.** Node's own `fs.rm` retry parameters do the work.
- **Never the board worktree.** No command touches `.worktrees/kanmer`.

## Ordered steps

1. `npm install` in `.worktrees/core-128` so the worktree owns its `@kanmer/core` resolution.
2. Add `removeTreeWithRetry` to `packages/core/src/io.ts` with its Windows doc comment;
   `npm run build:core`.
3. Add `packages/core/vitest.config.ts` with the sized `testTimeout`/`hookTimeout` comment.
4. Route every temp-root teardown in `packages/core/src/*.test.ts` through the helper; run
   `npm run test -w @kanmer/core` under load and confirm the previously failing cases pass.
5. Route the `packages/mcp-server` and `scripts` test teardowns through the helper (imported
   from `@kanmer/core`), and apply changes 4 and 5 of *Required changes*.
6. Fix `scripts/antigravity-plugin-config.test.mjs`: strip `NoDefaultCurrentDirectoryInExePath`
   from the child env with its comment, route the `finally` removals through the helper. Confirm
   both tests pass in *this* agent shell, where they currently fail 1/1.
7. Route the `apps/gui` test teardowns through the helper; `npm run typecheck`.
8. Add the AGENTS.md §8 gotcha.
9. `npm run plugin:build` in the worktree, then `npm run plugin:check`.
10. Run the full rail: ten consecutive `npm run verify`, at least three with the load generator
    (or a second rail) running. Record every exit code honestly, including any run short of ten.
11. Write the post-implementation report, open the PR with the `Kanmer: CORE-128` footer, move
    the ticket to Review.

## Acceptance checks

- **Production caller:** `removeTreeWithRetry` is a public `@kanmer/core` export reached through
  `export * from "./io.js"` in `packages/core/src/index.ts`; its callers in this diff are the
  test teardowns across all four trees. It ships in the committed plugin bundle by construction,
  which `npm run plugin:check` proves byte-for-byte.
- **Negative evidence, not happy-path.** The proof of this ticket is the *reproduction* failing
  before and passing after: the same load recipe that produced `Test timed out in 5000ms` and
  `ENOTEMPTY … rmdir` must no longer produce them. Exit codes for both before and after are
  retained in the report.
- **Regression boundary.** Board write-lock semantics, lease/claim behaviour, the readiness
  timeout *assertions*, the Antigravity launcher token and the shipped shim are unchanged; the
  full 465-test core suite, the gui suite, the mcp-server http suite and the scripts suite all
  pass.
- **No weakened assertion.** `git diff` shows no removed or loosened `expect`/`assert`, and no
  new `.skip`/`.only`/`.todo` other than the authorised, reason-carrying conditional skip.
- **Ten consecutive clean `npm run verify` runs, at least three under concurrent load.** If ten
  are not achieved, the report states how many were achieved and what stopped it.

## Commands

Run from `C:\Users\Alex\Documents\GitHub\kanmer\.worktrees\core-128` unless stated.

```
npm install
npm run build
npm run test -w @kanmer/core
npm run test -w @kanmer/gui
npm run test:http -w @kanmer/mcp-server
npm run test:scripts
npm run typecheck
npm run plugin:build && npm run plugin:check
npm run verify                      # x10, at least 3 with the load generator running
```

Load for the loaded runs: `node %TEMP%\core128\hog.mjs 900` x6 in parallel, or a second
verification rail in a disposable worktree.

## Failure and deviation rules

- Stop and report if a suite fails for a reason outside the three causes above — that is a real
  defect, not this ticket's flake family.
- Stop if fixing something requires touching a *Do not modify* surface; record it instead.
- If ten consecutive clean runs cannot be obtained, do **not** re-scope silently: report the
  count achieved, the failures seen, and whether they are new members of the family.
- If a GUI test fails under load, adding `apps/gui/vitest.config.ts` on the same reasoning is an
  in-scope extension; record it as a deviation with the failure that justified it.
- Deviations are recorded in the post-implementation report, never applied silently.

## Stop condition

A PR is open against `main` with a `Kanmer: CORE-128` footer, the post-implementation report is
written, and the ticket is in **Review**. Do not review, merge, verify, close out or release, and
do not start another ticket.
