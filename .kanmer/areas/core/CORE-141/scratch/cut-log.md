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
