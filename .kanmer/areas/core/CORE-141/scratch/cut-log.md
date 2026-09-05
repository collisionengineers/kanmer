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
