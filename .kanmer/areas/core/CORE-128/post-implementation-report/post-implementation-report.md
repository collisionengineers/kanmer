# Post-implementation report — CORE-128

*The report. Not the proof — this is the author's **claim**, written before merge; proof is **evidence**, gathered after.*

## Summary

`npm run verify` now passes **ten consecutive times on this Windows host, the first three
under deliberate concurrent load** (exit 0 ×10; see the table below). Every failure in the
ticket's list was reproduced on demand before the change rather than treated as flake, and the
family turned out to be **four** distinct causes, not one — two of which are defects in
*product* code, not in tests. No assertion was weakened, removed, loosened or skipped: the
`git diff` contains no deleted `expect`/`assert`, and the only new `.skip` is a
reason-carrying conditional that never fired in any of the ten runs.

### Reproduction recipe (record this; a verifier can rerun it)

Load generator — N processes, each looping: 40×4 KB writes + reads, a sha256 grind, and a
`rmSync` of the tree, on the same temp volume the suites use:

```
node %TEMP%\core128\hog.mjs 400        # x4-8 in parallel
```

Then, against `0f4a21fe` (pre-fix), any of:

| Lever | Result |
| --- | --- |
| `cd packages/core && npx vitest run` (file parallelism **on**) + 4 generators | exit 1 on the first attempt — 3 failures |
| `npm test` (the rail's real `--no-file-parallelism`) + 6 generators | exit 1 within one or two attempts — 2 failures |
| `node --test scripts/antigravity-plugin-config.test.mjs`, no load at all | exit 1, **1/1 and 6/6** — not load-sensitive |
| a second verification rail in another worktree instead of the generators | equivalent, and more realistic |

A second rail in `.worktrees/core-117` was genuinely running for much of this work, which is
how the last two members were found.

### The four causes

1. **Teardown races.** Every temp-root teardown was a bare
   `fs.rm(dir, { recursive: true, force: true })`. Node's recursive `rm` *does* retry
   `EBUSY`/`EMFILE`/`ENFILE`/`ENOTEMPTY`/`EPERM` — but only while `maxRetries > 0`, and the
   default is `0`. Windows releases handles asynchronously, so a delete-pending file still
   occupies its directory entry (`ENOTEMPTY`) and a directory that was a child process's
   working directory refuses (`EBUSY`). Reproduced as
   `ENOTEMPTY: directory not empty, rmdir '…\kanmer-claims-*\.kanmer'` and `…\kanmer-docs-*`.
   `io.test.ts:13` already passed `maxRetries: 3` — the right answer had been found once and
   never shared.
2. **Timing.** `packages/core` had no vitest config, so vitest's 5 s default `testTimeout`
   applied. Measured on this host: the board write lock (CORE-125) spends up to **2145 ms**
   (`DEFAULT_LOCK_RETRY_MS`) before a contended claim gives up, and the *first* locked write in
   each process resolves the Windows process identity through a synchronous
   `execFileSync("powershell.exe", …)` — **776 ms** for this process (cached afterwards) and
   **1103 ms** for any other pid (never cached), giving a **998 ms** first `updateItem` against
   **25.9 ms** steady state. Vitest isolates modules per test *file*, so every file pays the
   probe again. That is 63 % of a 5 s budget consumed before an assertion runs.
3. **Environment, not load.** The two `scripts/antigravity-plugin-config.test.mjs` `cmd.exe`
   tests failed **100 % under an agent and 0 % everywhere else**. An agent harness defines
   `NoDefaultCurrentDirectoryInExePath=1` in its process environment — process scope only;
   `[Environment]::GetEnvironmentVariable(…,'User')` and `…,'Machine'` are both empty — and the
   fixture forwarded `{ ...process.env }` to its child. While that variable is defined, cmd
   drops the current directory from its command search path, so the shipped
   `pushd !LOCALAPPDATA!\Kanmer\bin&&call kanmer-mcp.cmd` token cannot resolve the shim the test
   had just written: `'kanmer-mcp.cmd' is not recognized`. That is why the hosted runner was
   green on exactly these two while every agent-driven `npm run verify` was red, and why the
   ticket recorded them under a different symptom (`EBUSY rmdir …\Kanmer Test Space\Kanmer\bin`
   — a *second*, separate race in the same `finally`, since `bin` is the just-exited cmd.exe's
   working directory).
4. **A lock budget sized for the wrong critical section — a real product defect.**
   `kanmerGit.ts`'s `resumeOrphanMigration` runs `git commit`, `git push`, `git diff`,
   `git rm`, a full directory fingerprint and a tree removal inside `withExclusiveFileLock`, on
   the shared ~2.1 s default that is sized for a board *file* write. Measured under load the
   section takes **17-19 s**, so the second concurrent caller exhausted its retries and reported
   the migration **unavailable** — a lost race presented to the user as a failure. This was
   found by the sweep (`kanmerGit.test.ts > serializes concurrent orphan cleanup …`,
   `expected false to be true`) and is not a test-budget problem; the test was right.

## Changes

| File | Change | Why |
|---|---|---|
| `packages/core/src/io.ts` | added `removeTreeWithRetry` / `removeTreeWithRetrySync` | The one shared answer to cause 1, sitting beside `renameWithRetry` — the same species of Windows accommodation. Bounded: 10 attempts × 100 ms. `force: true` keeps a missing target a no-op; anything still failing after the budget is thrown, not swallowed. |
| `packages/core/vitest.config.ts` | added | `testTimeout`/`hookTimeout` at 30 s, with a comment sizing it against the 2145 ms lock budget, the ~1 s identity probe, and the 3-5× slowdown under a second rail. |
| `packages/core/src/*.test.ts` (13 files, incl. `capture.test.ts`) | teardowns → helper | Cause 1. `io.test.ts`'s local `maxRetries: 3` is replaced by the shared helper. `capture.test.ts` arrived on main with CORE-117 mid-flight and was converted on rebase. |
| `packages/mcp-server/src/**/*.test.mjs` (9 files) | teardowns → helper | Cause 1, imported from `@kanmer/core` (a declared dependency; `project-registry.test.mjs` already imported it). |
| `packages/mcp-server/src/http.test.mjs` | `spawnSync` timeout 2 s → 30 s; in-flight-cap test **strengthened** | The child boots a whole cold Node process and imports `dist/http.js` before it can answer — the ticket's `spawnSync ETIMEDOUT`. Separately, the cap test waited a fixed 5 ms and *hoped* the first request had reached the authorizer; it now awaits a promise the authorizer itself resolves, so "the cap is occupied" is an observation rather than a guess. |
| `packages/mcp-server/src/tunnels/readiness.test.mjs` | two success-path budgets raised | The ticket's `TUNNEL_READINESS_TIMEOUT`. The "delayed local success" case (1 s covering a deliberate 150 ms server delay) and the "bounded successful /ready response" case (100 ms for two event-loop-scheduled polls). Both still assert `attempts === 2`. **The two cases that assert `TUNNEL_READINESS_TIMEOUT` at `timeoutMs: 5` are untouched — shortening is their point.** |
| `packages/mcp-server/src/tunnels/supervisor.test.mjs` | `waitFor` default 1 s → 30 s | A hang guard, not a latency assertion. |
| `packages/mcp-server/src/tunnels/cloudflared.test.mjs` | "hung" race 1 s → 30 s | At 1 s a slow host could win the race and report `hung` instead of `TUNNEL_CHILD_EXITED_BEFORE_READY`. |
| `scripts/antigravity-plugin-config.test.mjs` | `launcherEnv()` deletes `NoDefaultCurrentDirectoryInExePath` from the **child** env; exec timeout 5 s → 30 s; reason-carrying `t.skip` if the shim is still unreachable | Cause 3. Every assertion is unchanged. |
| `scripts/*.test.mjs` (10 files) | teardowns → helper | Cause 1, via `../packages/core/dist/index.js` — the precedent already used by `scripts/auto-run-state.test.mjs` and `scripts/release-notes.mjs`, so the scripts rail needs no package resolution. |
| `apps/gui/src/main/**/*.test.ts` (13 files) | teardowns → helper via `@kanmer/core` | Cause 1. `@kanmer/core` rather than a loose `.mjs`, because `apps/gui/tsconfig.node.json` is `composite` and typechecks its tests. |
| `apps/gui/src/main/kanmerGit.test.ts`, `index.sync.test.ts` | `beforeEach` given the file's existing `REAL_GIT_*_TIMEOUT_MS` | Their `afterEach` already carried the 30 s budget; `beforeEach` — eight or nine real `git` subprocesses — ran on vitest's 10 s default and failed `Hook timed out in 10000ms`. Kept file-scoped exactly as the note above `REAL_GIT_TEST_TIMEOUT_MS` asks, rather than raising the GUI global. |
| `apps/gui/src/main/kanmerGit.ts` | **production**: explicit ~32 s `retryDelaysMs` for the orphan-migration lock; two tree removals → `removeTreeWithRetry` | Cause 4, plus the quarantine removal that runs immediately after `git rm` released the tree — an un-retried `ENOTEMPTY` there took the restore path and turned a completed migration into a retained quarantine. |
| `AGENTS.md` | new §8 gotcha 20, parts (a)-(d) + the reproduction recipe | So a verifier stops rediscovering this, and so new tests are written against the shared helper. |

Not changed: `plugins/kanmer/mcp/kanmer-mcp.cjs`. `plugin:build` was run and regenerated it to
**identical bytes** — tsup tree-shakes the new export because no server code calls it — and
`plugin:check` certified that ("39 tools match, bundle bytes match"). See deviation 1.

## Governing docs

- **`docs/functional/frd/FRD-035-golden-board-and-candidate-promotion-safety.md` — Meets.**
  AC1 requires golden fixtures that "retain exact command evidence and terminal result"; AC5
  requires required CI and Kanmer gates green for a promotion record. Neither is attainable
  while the shared rail returns a non-deterministic terminal result — a red `npm run verify`
  carried no information about whether the candidate was sound, which is exactly the judgement
  FRD-035 wants mechanical. This removes the non-determinism. No board behaviour, contract or
  acceptance criterion changes, so the FRD text is unmodified.
- No other governing doc is linked, none is modified, and no new ADR is required: nothing here
  is a design decision about product behaviour. The one candidate design question — replacing
  the lock's PowerShell identity probe — is deliberately out of scope (see follow-ups).

## Risks / follow-ups

**Deviations from the plan, all deliberate:**

1. **No generated-artifact change.** The plan predicted a `plugins/kanmer/mcp/kanmer-mcp.cjs`
   rebuild because `io.ts` changed. `plugin:build` was run in a worktree that owns its
   `@kanmer/core` resolution, and produced identical bytes; `plugin:check` passed. Correct
   outcome, not a skipped step.
2. **Scope grew to two production files** (`apps/gui/src/main/kanmerGit.ts`) and to
   `supervisor.test.mjs` / `cloudflared.test.mjs`, none of which the plan's *Expected files*
   listed. Each was added only after the rail actually failed on it, and each is the ticket's
   own stated remit ("fix what is a real defect: timing assumptions that are too tight for
   Windows filesystem semantics, and teardown that races the OS releasing handles"). The plan's
   deviation rule required recording rather than silence; this is that record.
3. **The GUI extension the plan pre-authorised was applied narrowly.** The plan allowed adding
   `apps/gui/vitest.config.ts` if a GUI test failed under load. One did — but the file it failed
   in carries an explicit comment asking that the larger budget stay *scoped to the file* rather
   than weakening the GUI global for pure tests. The two `beforeEach` hooks were given the
   file's own existing constant instead. No `apps/gui/vitest.config.ts` was added.
4. **Operator error, recorded for honesty.** An early sweep ran two `npm run verify` instances
   concurrently in the same worktree after a `pkill` failed to take. Its results were discarded
   as uninterpretable and the sweep was restarted single-instance under a lock. The
   `kanmerGit` failure it surfaced was *not* an artefact — it reproduced cleanly in the guarded
   sweep and is fixed.

**Risks a reviewer should weigh:**

- **Raised timeouts slow down failure reporting.** A genuinely hung core test now takes 30 s
  rather than 5 s to report. Each raised budget carries a comment saying it is a hang guard
  rather than a latency assertion, so a reviewer can judge them individually.
- **The `kanmerGit.ts` lock budget is the one real behaviour change.** A caller now waits up to
  ~32 s for a concurrent orphan migration instead of ~2.1 s. It remains bounded, and the lock's
  stale-owner recovery is untouched, so a dead holder is still reclaimed rather than waited on.
- **The antigravity conditional skip could in principle mask a regression.** It fires only on
  `'…is not recognized as an internal or external command'` and reports the reason. It did
  **not** fire in any of the ten runs (`node:test` reported `skipped 0`), so both tests really
  executed.
- **~45 recursive removals in production and rail-script code were deliberately left alone**
  (`connect.ts`, `remoteAccess/manager.ts`, `cloudflared.ts`, `smoke*.mjs`, `verify*.mjs`,
  `build-mcpb.mjs`). None has been observed failing; converting them would either add a build
  dependency to deliberately standalone rail scripts or duplicate the helper. If one ever
  surfaces, gotcha 20(a) names the fix. `scripts/verify.mjs` in particular cannot import the
  helper, because `npm run build` is its own first step.

**Follow-up worth its own ticket (not filed here — this lane was scoped to CORE-128 only):**

- **The Windows process-identity probe is a production latency defect.** The first locked board
  write in every process costs ~1 s because `defaultProcessIdentity` shells out to PowerShell
  synchronously, blocking the event loop; a *foreign* pid costs ~1.1 s and is never cached, so
  contended lock recovery pays it repeatedly. Fixing it means changing the identity string two
  processes compare to detect PID reuse — a lock-contract change (AGENTS.md §8 gotcha 17), and
  a mismatch between the "self" and "foreign" formats would let a live lock be reclaimed as
  stale. Out of scope here; the measurements are in `scratch/research.md`.
- **The shipped Antigravity launcher token is itself subject to cause 3.** A host that really
  does define `NoDefaultCurrentDirectoryInExePath` cannot run the installed shim. The fixture no
  longer inherits the variable, but the product gap is real. It belongs to the launcher's own
  ticket (gotcha 13), and gotcha 20(c) now records it.

## Verification hand-off

Run on the merged `main` at the merge SHA, from a worktree that owns its own `npm install`
(`plugin:check` refuses otherwise — AGENTS.md §8 gotcha 8):

1. `npm run verify` — expect exit 0. Repeat under load to exercise the actual claim:
   `node %TEMP%\core128\hog.mjs 3000` ×3 in parallel, or a second rail in another worktree.
   The generator script is reproduced in `scratch/research.md`; recreate it there rather than
   assuming `%TEMP%` still holds it.
2. `node --test scripts/antigravity-plugin-config.test.mjs` — expect **exit 0, 4 passed,
   `skipped 0`**. `skipped 2` would mean the shim was unreachable and the launcher claim was
   not actually exercised; that is a reportable INCONCLUSIVE, not a pass.
3. `cd packages/core && npx vitest run` (file parallelism deliberately **on**) with 4 load
   generators — this is the lever that failed 3 tests before the change; expect exit 0 and
   465+ passing.
4. `cd apps/gui && npx vitest run --no-file-parallelism src/main/kanmerGit.test.ts -t "serializes concurrent orphan cleanup"`
   with 5 load generators — expect exit 0. Expect the test to take **15-20 s**: that is the
   waiter legitimately waiting out the lock, and is the direct evidence for cause 4.
5. `npm run plugin:check` — expect `bundle bytes match`. The bundle is unchanged by this PR.
6. No UI change, so no screenshots.

### Evidence retained (this branch, at `7061045b`)

`npm run verify` ×10, all exit 0, runs 1-3 with three load generators each. Every run completed
the full rail (last step `plugin-sync OK`).

| Run | Loaded | Exit | Seconds |
| --- | --- | --- | --- |
| 1 | yes | 0 | 955 |
| 2 | yes | 0 | 840 |
| 3 | yes | 0 | 786 |
| 4 | no | 0 | 441 |
| 5 | no | 0 | 439 |
| 6 | no | 0 | 501 |
| 7 | no | 0 | 511 |
| 8 | no | 0 | 455 |
| 9 | no | 0 | 490 |
| 10 | no | 0 | 563 |

Supporting runs: the pre-fix parallel+load reproduction now exits 0 (465/465); mcp-server suite
×5 under 6 generators, 5/5 exit 0; scripts suite ×6 under 8 generators, 6/6 exit 0 (it was 0/6
before); `antigravity-plugin-config.test.mjs` 4/4 with 0 skipped (2 failures before);
`serializes concurrent orphan cleanup` ×3 under 5 generators, 3/3 exit 0 at 17.1 / 18.1 / 19.4 s.
`npm run typecheck`, `npm run build`, `npm run plugin:build`, `npm run plugin:check` all exit 0.

---

## Addendum — evidence at the final head `1d1f09b4`

The ten-run sweep above was measured at `7061045b`. `main` then advanced twice under this branch
(CORE-117 `bf0eaed4`, CORE-116 `28a12643`), each landing new test files carrying the same bare
teardown, so the branch was rebased and those seven conversions added. Two further findings
followed, both recorded here rather than folded silently into the earlier claim.

**Finding 5 — the real-Git budget was marginal, not generous.** A confirmation run under a
concurrent rail failed `ensureBoardWorktree reconciliation > preserves the root when first-time
remote attachment ignore fails` with `Test timed out in 30000ms` at **35.2 s**. These cases each
drive a dozen or more real `git` subprocesses, so their budget tracks Windows process latency,
not the code under test. `REAL_GIT_TEST_TIMEOUT_MS` and `REAL_GIT_FIXTURE_TIMEOUT_MS` move from
30 s to **120 s** — ~3.4× the worst measured case, still bounded, still scoped to those two files
rather than raised into the GUI global.

**Finding 6 — a watcher outliving its fixture, found by the hosted runner.** CI failed the rail
while the GUI suite itself reported **524/524 green**: an *unhandled rejection* after the run,
`EPERM: operation not permitted, watch '…\kanmer-core084-sync-*\repo\.worktrees\kanmer\.kanmer\areas'`.
`index.sync.test.ts`'s teardown dropped the project's context entry by hand, but `closeProject`
is what closes the filesystem watcher — so the watcher kept running over a fixture the same hook
then deleted. **This race is pre-existing: `main`'s teardown is byte-identical**, and it is
intermittent, which is why it had not yet failed a push-to-main run. It is the same species as
everything else here, so it is fixed rather than left for someone else's verification.

### Final-head evidence

| Check | Result |
| --- | --- |
| GitHub Actions `verify` on `1d1f09b4` (hosted Windows runner) | **pass**, 6 m 11 s |
| `npm run verify` local, loaded (3 generators) | exit 0, 1632 s |
| `npm run verify` local, loaded (3 generators) | exit 0, 1862 s |
| `npm run verify` local, unloaded | exit 0, 665 s |
| `npm run typecheck` | exit 0 |
| `npx vitest run src/main/index.sync.test.ts` after finding 6 | 11/11 pass, no unhandled rejection |

So: **10/10 clean `npm run verify` at `7061045b`** (three loaded) — the ticket's stated
acceptance criterion, met in full — plus **3/3 clean at the final head `1d1f09b4`** (two loaded)
and an independent green hosted-runner `verify`. The ten-run streak was not re-measured at the
final head; the delta between the two SHAs is seven mechanical teardown conversions, two raised
constants, and the `closeProject` teardown fix. A verifier should treat the merge SHA as the
thing to prove and follow the hand-off above.

### Outstanding at hand-off

`kanmer-gate` reports `WRONG_STAGE` (`implementing`, expected `review`) — it is read from the
board and clears once this ticket is in Review and the board branch tip is pushed to
`origin/kanmer-board`; the gate reads the **remote** board tip and does not re-run on a board
push, so the `regate` job needs triggering after that. This lane never touches
`.worktrees/kanmer`. `NO_REVIEW_RECORD` is expected — the author does not write the attestation.


---

## Red-main remediation — exact current-base repair

PR #300 merged as `d523a29365a20133fc5f0e16a29df40b1a80bd8e`. Its retained
`proof/proof.md` is a truthful **FAIL**: both the clean local Windows rail and hosted CI fail
with exactly 15 `ReferenceError: rmSync is not defined` results in
`scripts/verify-skill-prose.test.mjs`. SKILL-036 had added 15 teardown cases after the
CORE-128 branch converted the earlier cases and removed the `rmSync` import, so the clean Git
merge produced a semantic conflict rather than a textual conflict.

### Correction

The existing branch and worktree were resumed without retaking or recreating them. Prior reviewed
head `1d1f09b42587f82d1acd9d013d3a9ad6b18161f8` was preserved as the first parent of an
ordinary merge with current main `d523a29365a20133fc5f0e16a29df40b1a80bd8e`. The only
textual conflict was the appended test block. It was resolved by converting all 15 remaining
bare teardown calls to the already imported `removeTreeWithRetrySync`.

Candidate `662938dbef8bf65ad9762a30bba4b396ca249634` has parents `1d1f09b…` and
`d523a293…`. Its complete diff against current main is one file, 15 insertions and 15
deletions, all mechanical teardown-helper substitutions. No assertion, test body, timeout,
production source, workflow, or SKILL-038 behaviour changed, and no bare `rmSync(` remains.

### Pre-review evidence at the exact candidate

| Command | Checkout | Result |
| --- | --- | --- |
| `node --test scripts/verify-skill-prose.test.mjs` | recorded ticket worktree | exit 0; 28/28 pass; 0 skipped |
| `npm run test:scripts` | recorded ticket worktree | exit 0; 136/136 pass; 0 skipped |
| `npm run verify:skills` | recorded ticket worktree | exit 0; all checks pass |
| `npm ci` | clean standalone GitHub clone | exit 0 |
| `npm run verify` | clean standalone GitHub clone at exact `662938db…` | exit 0; core 562/562, GUI 524/524, MCP server 144/144, scripts 136/136, smoke 338/338, protocol 50/50, discovery 13/13, agents-block 31/31; plugin bundle bytes match |

Only one complete verification rail ran on this host. The original ticket's ten-run streak was
already satisfied and retained above. This remediation fixes a deterministic missing binding:
the same 15 failures occurred locally, in the focused scripts rail, and in hosted CI at
`d523a293…`; after all 15 surviving call sites were converted, the focused suites and one
complete clean rail passed at the exact candidate. Repeating unchanged full rails to manufacture
another numeric streak would add no evidence. The independent exact-head review, hosted
`verify`, and post-merge exact-SHA verification remain the binding next stages.

### Review hand-off

PR #305 carries the one-file remediation with `Kanmer: CORE-128`. Review must replace the stale
PR #300 attestation with a fresh independent attestation bound to exact head
`662938dbef8bf65ad9762a30bba4b396ca249634`, wait for required checks, and preserve the
existing failed proof until a verifier rewrites it only after the new merge.
