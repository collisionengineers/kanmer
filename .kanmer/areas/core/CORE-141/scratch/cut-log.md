## Phase A orientation and preconditions (2026-09-05, operator run)

Orientation read: get_status, get_item CORE-141, get_group_doc HZN-009 context.md, scripts/release.mjs (full), AGENTS.md release/golden/golden:promotion/dist:check rows, CORE-137 scratch/promotion.md + proof/proof.md (precedent transcript for v0.4.1 cut), packages/core/src/migrate.ts (auditProofRecords, migrateProofValidation), scripts/golden-promotion.mjs (--candidate, --dry-run contract).

Note: CORE-141's own implementation PR #331 ("Release notes for 0.4.2 Delivery Recovery (CORE-141)") is already MERGED (2026-09-05T16:21:18Z, head CORE-141-release-0.4.2 -> main). Board still shows CORE-141 in `review` stage with worktree `.worktrees/CORE-141` recorded (leave per instructions; closeout removes it). This is distinct from the release PR that release.mjs will open in step 7.

### Preconditions (all PASS)
| Check | Command | Result |
|---|---|---|
| Clean tree | `git status --short` | only `Kanmer_Upgrade_Pack_2026-09-05/`, `docs/kanmer-error-screen-04-09-26.png`, `info-pack/` (untracked) — PASS |
| HEAD == origin/main | `git rev-parse HEAD`; `git fetch origin main && git rev-parse origin/main` | both `8c515c4afbeba2a3ddf09f40d7d2c6fbe15656f5` — PASS |
| release-notes has 0.4.2 | `grep -m1 "0.4.2" apps/gui/release-notes.md` | `## 0.4.2` present — PASS |
| gui package.json version | `grep '"version"' apps/gui/package.json` | `0.4.1` — PASS |
| gh pr list --state open | `gh pr list --state open` | empty (PR #331 is MERGED, not open) — PASS |
| git worktree list | `git worktree list` | main @8c515c4a, `.worktrees/CORE-141` @415aeb69 [CORE-141-release-0.4.2] (merged branch, left per instructions), `.worktrees/kanmer` @2ab5fc13 [kanmer-board] — PASS, matches expected set exactly |
| tag v0.4.2 | `git tag -l v0.4.2` | empty — PASS |
| node -v | `node -v` | v24.15.0 — PASS |

All preconditions satisfied. Proceeding to sequence step 1 (npm ci).

## Step 1: npm ci

`npm ci` (root) — exit 0, ~20s, 647 packages added/audited (16 vulnerabilities pre-existing, not addressed here — out of scope for this phase).

## Step 2: npm run verify — in progress

Started 2026-09-05 ~17:23:41 local. The background-task wrapper around it was reported "killed... system running low on memory" by the harness at ~17:25, but process inspection (`Get-CimInstance Win32_Process`) confirmed the actual `npm run verify` process tree (npm PID 6592 -> cmd 25476 -> node scripts/verify.mjs, and vitest PID 24464 for the GUI package) was still alive and the log (`/tmp/npm-verify.log`) was still growing — only the outer tracking wrapper/Monitor was killed, not verify itself. Host had other unrelated heavy processes already running before I started (multiple `codex --yolo` agents, two `@azure/mcp` servers, and what looks like two `npm run test` (scripts) processes plus another stray `npm run verify`/vitest tree) — contention is from pre-existing host activity, not something this run spawned. Free physical memory was ~3.1GB/14.6GB total at the time.

Progress captured before the kill: core package 1028/1028 tests passed (26 files, 72.18s); GUI package vitest run in progress (connect.test.ts 64/64, marketplace/GUI-147/GUI-149 tests passing) when the wrapper was killed.

Re-armed tracking directly against the live process (no retry issued — the same run is still executing) rather than re-invoking `npm run verify`, since restarting would violate the single-heavy-process rule while the first run is still live and healthy.

## Step 2: npm run verify — attempt 1 result: FAIL (transient)

Attempt 1 finished with exit 1. Root cause in the log: `apps/gui` vitest run crashed with `Error: Worker exited unexpectedly` (tinypool ChildProcess.onUnexpectedExit) partway through `ensureBoardWorktree reconciliation` suite, which cascaded to `Error: Command failed: npm run test -w @kanmer/gui` -> `Error: Command failed: npm run test:built` -> verify.mjs exit 1. No failing assertion anywhere in the log — this is a worker process crash, not a code/spec failure.

Classification: **transient**, evidenced by host memory pressure — `Get-CimInstance Win32_Process` at the time showed multiple unrelated heavy processes already running on this host that I did not start: 2x `codex --yolo` agents, 2x `@azure/mcp` server processes, and what appears to be other stray `npm run test`/`npm run verify` trees. Free physical memory was ~3.1-3.7GB out of 14.6GB total throughout. I did not kill any of those other processes (not mine to kill, no authorization) or otherwise touch the host beyond this ticket's own work.

Per instruction ("do not retry more than once for an evidenced transient"): retrying npm run verify exactly once now (attempt 2), from clean root main, no working-tree changes made. Started at UTC per /tmp/verify-start2.txt, log at /tmp/npm-verify2.log.

## Step 2: npm run verify — attempt 2 result: FAIL (same transient signature) — STOPPING

Attempt 2 (clean root main, no working-tree changes, started immediately after attempt 1): same crash signature as attempt 1 — `Error: Worker exited unexpectedly` (tinypool `ChildProcess.onUnexpectedExit`) inside the `apps/gui` vitest run, this time further along (after `src/main/index.sync.test.ts`, 11/11 passed, rather than mid-`ensureBoardWorktree reconciliation`), again cascading through `npm run test -w @kanmer/gui` -> `npm run test:built` -> `verify.mjs` exit 1. No failing assertion in either attempt; both are vitest worker-process deaths consistent with host memory exhaustion (free physical memory held at ~3.1-3.7GB/14.6GB throughout both runs, with several unrelated heavy processes — 2x `codex --yolo`, 2x `@azure/mcp` server — already running on this host before and during both attempts, not started by this operator run).

Per the instruction "do not retry more than once for an evidenced transient": **stopping here after 2 consecutive attempts.** Both attempts used identical inputs (clean `main` at `8c515c4a`, no code changes) and failed with the identical non-deterministic worker-crash signature at different points in the suite — this is strong evidence the failure is host resource exhaustion, not a code, test, or plan defect. `dist/verify-stamp.json` was not reached in either attempt (verify never completed a full pass), so it cannot be inspected/reported.

**Decision: Phase A halts at step 2.** Steps 3-8 (golden, golden:promotion, CORE-129 census, release.mjs dry-run and real prepare) were not run — release.mjs itself re-runs the full verify rail internally (step 7), so proceeding past a verify that cannot currently complete would either reproduce the same crash mid-script or, worse, risk packaging on an unverified tree. No release branch, PR, tag, or board state was created or mutated. Ticket left in `review` stage unchanged; no `update_item` call made (no PR to record — nothing shipped this phase).

**Recommended remediation before retry:** free host memory (identify and, with the operator's authorization, stop or relocate the unrelated `codex --yolo` / `@azure/mcp` processes competing for RAM) or run verify at a time/host where this process is genuinely the only heavy one, then rerun `npm run verify` fresh. Once it passes cleanly (dist/verify-stamp.json dirty:false), resume at step 3.

## Coordinator-directed bounded diagnostic (host check: CPU ~50%, free mem 3.1GB/13.9GB, codex/azure processes confirmed owner's other sessions, not to be stopped)

### npm run build (root, prerequisite for GUI tests)
Exit 0. Log `/tmp/npm-build.log`. Core+server dist rebuilt (kanmer-mcp.cjs 2.00MB, doctor-cli.cjs 2.23MB, remote-cli.cjs 2.13MB, build success in 639ms for the standalone bundle stage; full `npm run build` pipeline completed cleanly).

### npm run test -w @kanmer/gui — standalone, run 1 (no heap flag)
Start 2026-09-05T16:34:16Z. Failed again with the identical tinypool crash: `Error: Worker exited unexpectedly` at `node_modules/tinypool/dist/index.js:118` (`ChildProcess.onUnexpectedExit`), this time immediately after the `ensureBoardWorktree reconciliation > is idempotent once the worktree is on the branch` test (last suite in that block), before any GUI-152/CORE-129-specific suite ran. Cascaded to `npm error Lifecycle script "test" failed with error, code 1`. No assertion failure anywhere in the log — pure worker-process death. Wall time to crash ~3 min. Full log at `/tmp/gui-test.log` (107 lines; no trailing EXIT: marker because the wrapping bash subshell itself was killed by the harness's own low-memory guard, same as the two full-rail attempts — the npm error text confirms effective exit 1 regardless).

`grep -n "Worker exited\|FATAL\|heap\|out of memory" /tmp/gui-test.log`: only the `Worker exited unexpectedly` lines match; no FATAL/heap/OOM strings present in vitest's own output (Node's default OOM abort message was not emitted, consistent with the OS/task-runner killing the child process rather than V8 raising a JS heap OOM inside it).

### npm run test -w @kanmer/gui — diagnostic run 2, NODE_OPTIONS=--max-old-space-size=4096 (diagnostic only, not a permanent change; env var scoped to this one invocation)
In progress, started per `/tmp/gui-test-heap-start.txt`, log `/tmp/gui-test-heap.log`.

### npm run test -w @kanmer/gui — diagnostic run 2 result: FAIL, identical crash point even with 4GB heap ceiling

`NODE_OPTIONS=--max-old-space-size=4096 npm run test -w @kanmer/gui` — same crash: `Error: Worker exited unexpectedly` (tinypool `ChildProcess.onUnexpectedExit`, `node_modules/tinypool/dist/index.js:118`), at the **exact same point** as every prior attempt. Log `/tmp/gui-test-heap.log`.

### Root-caused: exact failing location (identical across all 4 crash attempts: 2 full-rail `npm run verify` + 2 standalone `npm run test -w @kanmer/gui`, one with 4GB heap)

**File:** `apps/gui/src/main/kanmerGit.test.ts`
**Test:** the very last test in the file — `describe("ensureBoardWorktree reconciliation", ...) > realGitTest("is idempotent once the worktree is on the branch", ...)` (source lines 994-1001, file ends at line 1001 immediately after this test's closing brace).
**Worker message:** `Error: Worker exited unexpectedly` thrown from tinypool (`ChildProcess.onUnexpectedExit` -> `ChildProcess.emit('error')` -> unhandled at `node:events:487`), immediately after that test's `✓` line prints — i.e. the crash happens during worker teardown/handoff to the next test file, not during a running assertion. No JS heap OOM message, no "FATAL", no "out of memory" string anywhere in any of the 4 logs (`grep -n "Worker exited\|FATAL\|heap\|out of memory"` matches only the `Worker exited unexpectedly` lines).

**Why this is NOT simple host memory pressure:** raising `--max-old-space-size` to 4096MB (diagnostic only, not committed) made zero difference — same test, same crash. If this were ordinary V8 heap exhaustion inside the worker, a larger heap ceiling should have shifted or cleared the crash point. It did not. Combined with the crash always landing at the identical spot (end of `kanmerGit.test.ts`, whose suite uses `realGitTest(...)` — real (non-mocked) git subprocess calls building actual worktrees/remotes under `REAL_GIT_TEST_TIMEOUT_MS`), this looks environment/mechanism-specific to real Git child-process teardown on this host (e.g. AV scanning of freshly-created git worktree files, orphaned git subprocess/file-handle cleanup racing tinypool's worker recycle) rather than pure RAM exhaustion, even though overall host free memory was also low (~3.1GB/13.9GB) throughout.

**Stopping per coordinator's branch (3): standalone GUI suite fails even with the larger heap.** No `npm run verify` attempt 3 was run. Steps 3-8 remain not run. All four logs preserved: `/tmp/npm-verify.log` (attempt 1), `/tmp/npm-verify2.log` (attempt 2), `/tmp/gui-test.log` (standalone run 1), `/tmp/gui-test-heap.log` (standalone diagnostic run 2 with 4GB heap). `npm run build` (root) succeeded cleanly (exit 0) and is not implicated.

Awaiting coordinator decision on whether this is a real defect (possibly touching GUI-152/CORE-129 or the `ensureBoardWorktree`/`kanmerGit` real-git suite specifically) that windows-latest CI tolerates but this host does not, versus an accepted environmental gap for this operator machine.

## Coordinator diagnosis and fix: host disk exhaustion, not RAM

Coordinator found the real cause: 1,689 `kanmer*` disposable test-board directories (22,500 entries total) accumulated in `%TEMP%` from today's runs, with the disk at 96% full — the crash sat exactly at real-git worktree teardown against that saturated directory (matches the `kanmerGit.test.ts` real-git `ensureBoardWorktree` teardown location I identified). Coordinator removed all `kanmer*` temp dirs (1689 -> 1) plus two unregistered `.worktrees` residue dirs; free disk went from ~4% to 51GB free (95%->... now healthy). This explains why raising `--max-old-space-size` didn't help: it was never a V8 heap problem, it was disk/inode pressure under real git worktree creation in TEMP.

### npm run test -w @kanmer/gui — standalone run 3 (post cleanup, no NODE_OPTIONS)
`kanmer*` dirs in $TMP before run: 1. Command: `npm run test -w @kanmer/gui > /tmp/gui-test-3.log`. Result: **PASS**, exit 0. 57 test files passed (57/57), 646 tests passed (646/646). Start 17:48:36, duration 201.52s (~3m22s). `kanmer*` dirs in $TMP after run: **5**.

**0.5.0 observation (recorded only, not filed as a ticket per coordinator's instruction):** the GUI test suite's disposable test-board directories are not fully cleaned up after a run — 1 -> 5 `kanmer*` temp dirs across one `npm run test -w @kanmer/gui` invocation. Left unaddressed by design of this phase; worth a cleanup/afterEach-teardown ticket for a future horizon so TEMP doesn't再 saturate disk over repeated CI/local runs the way it did today (1,689 accumulated).

Proceeding to `npm run verify` attempt 3, justified per coordinator: reproducible host-state cause (disk exhaustion) identified and removed.

## Step 2 resolved: npm run verify attempt 4 (run by coordinator, Alex) — PASS

My own attempt 3 (started before the coordinator's) failed again with the same `Worker exited unexpectedly` -> `npm run test:built` cascade — most likely due to running concurrently with the coordinator's own verify invocation on the same host (temp/resource contention), not a new distinct cause. Superseded by the coordinator's clean run below; not treated as a third strike against the transient-retry budget since it ran concurrently with, not instead of, the fix verification.

**Attempt 4** (coordinator, from clean root main, after the temp cleanup): `npm run verify` exit 0, wall time 580s (~9m40s), log `/tmp/npm-verify4.log`. Confirmed via `dist/verify-stamp.json`: `dirty: false`, `head: "8c515c4afbeba2a3ddf09f40d7d2c6fbe15656f5"`, `node: "v24.15.0"`, lockHash `79590de9...`, with core/server/standalone output hashes recorded. Tail of the log shows the managed-AGENTS-block and plugin-sync checks passing (35/35 checks; `plugin-sync OK — 41 tools match, bundle bytes match, 12 skill frontmatters parse, manifests at v0.4.1, isolated MCP handshake lists 41 tools`).

Additional coordinator actions, recorded for completeness:
- Ruled out `KANMER_ROOT` as a trigger for the earlier crash — GUI suite passed 646/646 with it set.
- Filed **GUI-154** (HZN-010) for the Windows tinypool worker-exit flake and the disposable-test-board temp-directory leak (the 0.5.0 observation noted above — 1 -> 5 `kanmer*` dirs per GUI-suite run, 1,689 accumulated before today's cleanup). Recorded here rather than re-filed by me, per the coordinator's own instruction that this observation should be recorded, not filed, in my run.
- Added the three untracked planning paths (`Kanmer_Upgrade_Pack_2026-09-05/`, `docs/kanmer-error-screen-04-09-26.png`, `info-pack/`) to `.git/info/exclude` (machine-local, not tracked/committed) so `git status --short` is now clean and `release.mjs`'s dirty-tree/dirty-stamp refusal cannot trip on them incidentally.

Confirmed post-fix state: `git status --short` empty; `git rev-parse HEAD` = `8c515c4afbeba2a3ddf09f40d7d2c6fbe15656f5` (unchanged, still == origin/main). Root cause of the whole verify saga: host TEMP disk exhaustion (96% full, 1,689 leaked `kanmer*` test-board dirs) causing real-git worktree teardown in `kanmerGit.test.ts`'s last test to kill its tinypool worker — not RAM, not a code defect in this release's roster. Resolved.

**Proceeding to step 3 (golden) through step 8 (release.mjs real prepare) now**, per coordinator's explicit go-ahead.
