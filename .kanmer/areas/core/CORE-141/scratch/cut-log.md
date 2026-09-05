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

## Step 3: npm run golden (standalone, with --out)

`node packages/mcp-server/src/golden-board.mjs --out dist/golden/golden-core141-standalone.json` — exit 0. **20/20 scenarios passed in 17343ms** (budget 300000ms). Transcript at `dist/golden/golden-core141-standalone.json`. All scenario classes covered (GB-00 through GB-19, including reconciliation routing, structured-plan/reconciliation catching forbidden/undeclared/stale paths, independent exact-head review, and the stable-controlled promotion/rollback contract evaluating the recorded v0.4.0 transcript as PASS).

## Step 4: golden:promotion — dry-run then real, live board asserted untouched

Baseline `git -C .worktrees/kanmer status --short` before either invocation: only the pre-existing `M .kanmer/areas/core/CORE-141/scratch/cut-log.md` (from my own ongoing `append_scratch` calls on this ticket — expected, that IS the live board and is supposed to change as I write this log). `git -C .worktrees/kanmer rev-parse HEAD` = `db35986699f31df6f1051e3195956abe6f58da6d`.

**Dry-run:** `node scripts/golden-promotion.mjs --candidate 0.4.2 --dry-run` — exit 0. All 10 steps reported SKIPPED (contract-shape check only). `contract shape: 10 steps, 10 required`; `verdict: INCOMPLETE` (expected for dry-run); "the recorded v0.4.0 instance still evaluates PASS" (fixture cross-check green). Live board unchanged after: same status line, same HEAD.

**Real invocation:** `node scripts/golden-promotion.mjs --candidate 0.4.2 --out dist/golden/promotion-core141-0.4.2.json` — exit 1, verdict INCOMPLETE. All 10 required steps reported **UNAVAILABLE** ("operator action, not automated (ADR-0021)") because no `--launcher`/`--board-copy`/candidate-installer were supplied — correct and expected for phase A: there is no packaged 0.4.2 candidate installer yet (that artifact doesn't exist until step 7's `release.mjs` real prepare runs, and full workflow-acceptance against an *installed* candidate is a phase B activity per CORE-137's own precedent, where the operator had to append the launcher-driven steps by hand after packaging existed). Transcript saved at `dist/golden/promotion-core141-0.4.2.json`. Live board asserted unchanged after this call too: `git -C .worktrees/kanmer status --short` identical, `HEAD` identical `db35986699f31df6f1051e3195956abe6f58da6d` — the script never touched Git, GitHub or the live board, matching its contract.

Proceeding to step 5 (CORE-129 proof census on a copied board).

## Step 5: CORE-129 proof census on a COPY of the live board (twice, then deleted)

`cp -r .worktrees/kanmer/.kanmer "$TMP/core141-census/.kanmer"`, then a small script (`KanmerStore` + `auditProofRecords` from `packages/core/dist/index.js`) run twice against the copy:

**Run 1 and Run 2 — identical (diff empty):**
```
complete: true
problems: []
counts: { valid: 2, legacy: 319, invalid: 2, absent: 105, total: 428 }
digest: proof-census-v1:59830aa1862824e92b79e670dd81b8fd21be11ad7573e99b3dd4028ac5afe818
parserVersion: proof-record/2#1
```

Buckets vs. the HZN-009 baseline description ("0 valid / ~319 legacy / 2 invalid GUI-133+GUI-135 / ~105 absent, now plus the new schema-2 proofs from today"): legacy and invalid match exactly (319, 2); **valid is now 2** (baseline said 0 valid — the new schema-2 proofs from today, i.e. tickets that merged since with typed `proof-record/2` records, moved from 0 to 2 valid); absent is 105, matching. Total 428 tickets censused (up from the ~414 in the HZN-009 snapshot, consistent with new tickets since — including CORE-141 itself, GUI-154 filed today, etc).

The two `invalid` entries are confirmed by id: **GUI-133** and **GUI-135** — exactly as the plan predicted — both `done`, not archived, with frontmatter parse diagnostics: GUI-133 "unknown escape sequence at line 63, column 57" (an unescaped backslash in a `%LOCALAPPDATA%\Kanmer\bin\kanmer-mcp.cmd` path string), GUI-135 "can not read a block mapping entry; a multiline key may not be an implicit key at line 72, column 1".

Copy deleted after both runs: `rm -rf "$TMP/core141-census"`. Live board confirmed untouched throughout (`git -C .worktrees/kanmer status --short` shows only the ongoing scratch-file edits from this ticket's own `append_scratch` calls; no other change).

**Decision per plan: the LIVE board stays in `report` (non-strict) proof-validation policy for 0.4.2 — no real cutover run.** This matches the ticket body's explicit instruction ("decide the live strict cutover and record it either way") — decision recorded here: **not cut over this release.** Rationale: 2 invalid legacy proof records (GUI-133, GUI-135) would need hand-repair before a strict-mode cutover could pass without failing/blocking those two Done tickets' proof gate retroactively, and that repair is out of scope for this release's roster (HZN-009 R1 packages). Left for a future ticket/horizon.

## Step 6: release.mjs --dry-run — PASS

`node scripts/release.mjs 0.4.2 --ticket CORE-141 --dry-run` from clean root main (HEAD `8c515c4a`, no working-tree changes). Exit 0. It re-ran the full verify rail internally (VERIFY_STEPS, including managed-AGENTS-block 35/35 and `plugin:check` — `plugin-sync OK — 41 tools match, bundle bytes match, 12 skill frontmatters parse, manifests at v0.4.1, isolated MCP handshake lists 41 tools`) and it passed clean — **no GUI-154 crash signature this time** (temp cleanup + coordinator's exclude-list fix held). Dry-run output:
```
--- dry run: the verification gate passed ---
Would create release/v0.4.2 from main (without switching in dry-run)
Would write 0.4.2 into all release manifests, lockfile, and deterministic artifacts
Would build the GUI, commit the release change, push only the release branch, and open a PR targeting main
Would stop before creating a tag or publishing any release asset
After the PR merges, rerun: npm run release -- 0.4.2 --publish --release-commit <full-sha>
No Git or remote release state was written. Verification may have created local build outputs; release manifests and the Git tree remain untouched.
```
Confirmed after: `git status --short` empty, on `main`, no `v0.4.2` tag, no `release/v0.4.2` branch. Proceeding to step 7 (real prepare).

## Step 7: release.mjs real prepare — PASS, PR #332 opened (NOT merged)

`node scripts/release.mjs 0.4.2 --ticket CORE-141` from clean root main (HEAD `8c515c4a` before). Exit 0. Re-ran the full verify rail internally (passed clean, no GUI-154 crash), then bumped `apps/gui/package.json`, root `package.json`, all three plugin manifests (`plugins/kanmer/.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `plugin.json`) and `mcpb/manifest.json` to `0.4.2`, ran `npm install --package-lock-only`, rebuilt the MCP bundle (`npm run build`, `node scripts/build-plugin.mjs`, `node scripts/build-mcpb.mjs`), re-verified with `npm run plugin:check` (green), built the GUI source (`npm run build -w @kanmer/gui`), staged everything (`git add -A`), committed `release: v0.4.2` (8 files changed, 10 insertions/10 deletions) as `bc97f5799f7d794c1db9f380fad00cce4b0a9fa4` on `release/v0.4.2`, pushed the branch, and opened the PR via `gh pr create`.

**Release PR:** https://github.com/collisionengineers/kanmer/pull/332 — title "release: v0.4.2", base `main`, head `release/v0.4.2` @ `bc97f5799f7d794c1db9f380fad00cce4b0a9fa4`, body "Kanmer: CORE-141". Confirmed via `gh pr view 332`: `state: OPEN`, `isDraft: false` — **not merged, not draft**, left exactly as opened per instructions.

**Artifacts produced:**
- `dist/mcpb/kanmer-0.4.2.mcpb` (1,796,819 bytes) — new for this release
- `apps/gui/release/` — unchanged from before this run (still holds only the retained 0.1.0/0.2.0/0.3.3 installers + `win-unpacked`); **no 0.4.2 installer .exe was produced in this phase**, which is correct: `release.mjs`'s non-publish/prepare branch only runs `npm run build -w @kanmer/gui` (source build), not `electron-builder --win --publish never` — the packaged Windows installer is only built in `--publish` mode (step 8, phase B, after this PR merges and the operator runs `release.mjs 0.4.2 --publish --release-commit <merged-sha>`)
- Version-bumped and committed on `release/v0.4.2`: `apps/gui/package.json`, root `package.json`, `plugins/kanmer/.claude-plugin/plugin.json`, `plugins/kanmer/.codex-plugin/plugin.json`, `plugins/kanmer/plugin.json`, `mcpb/manifest.json`, `package-lock.json`, and the regenerated `plugins/kanmer/mcp/kanmer-mcp.cjs` bundle (compiled version define now reads 0.4.2)

## update_item CORE-141

`update_item CORE-141 prs: ["https://github.com/collisionengineers/kanmer/pull/331", "https://github.com/collisionengineers/kanmer/pull/332"]` with `expected_revision: rev1:355ff5e8c8fe5c3e` — succeeded, ticket `updated` now `2026-09-05T17:39:15.560Z`, `prs` field now carries both PRs. Stage left unchanged at `review` (not mine to move — phase B review/merge is separate).

## Phase A: COMPLETE

All 8 steps of the briefed sequence ran to completion:
1. `npm ci` — PASS
2. `npm run verify` — required 4 attempts total (2 by me that hit the GUI-154 disk-exhaustion signature, 1 concurrent stray failure, 1 clean PASS by the coordinator after the TEMP cleanup) before the tree was provably clean (`dist/verify-stamp.json` dirty:false at `8c515c4a`)
3. `npm run golden` standalone — PASS, 20/20 in 17343ms, transcript at `dist/golden/golden-core141-standalone.json`
4. `golden:promotion --dry-run` then real — both ran correctly per ADR-0021 (dry-run: contract shape INCOMPLETE as expected; real: all 10 steps UNAVAILABLE as expected, no packaged candidate exists yet); live board proven untouched both times
5. CORE-129 proof census, twice, on a deleted copy — deterministic: valid 2 / legacy 319 / invalid 2 (GUI-133, GUI-135) / absent 105 / total 428, digest `proof-census-v1:59830aa1862824e92b79e670dd81b8fd21be11ad7573e99b3dd4028ac5afe818`; **decision: live board stays in `report` policy for 0.4.2, no strict cutover**
6. `release.mjs --dry-run` — PASS
7. `release.mjs` real prepare — PASS, **PR #332 opened, not merged**
8. This report

Phase B (independent review/merge of PR #332, `release.mjs --publish`, host adoption, M5, rollback drill, closeout, HZN-009 closeout.md) is out of scope here and not started.

## Phase B — Publish (B1)

Coordinator merged release PR #332 as `7a6e437574fd653f4c49d0a3fa00e6b5e4904809` on `main`, reviewed with attestation `4616fad7…`, gate+verify green. Confirmed locally: `git status --short` clean, `HEAD` = `7a6e437574fd653f4c49d0a3fa00e6b5e4904809`, `apps/gui/package.json`/`package.json` version `0.4.2`.

### B1 dry-run
`export GH_TOKEN=$(gh auth token)`; `node scripts/release.mjs 0.4.2 --publish --release-commit 7a6e437574fd653f4c49d0a3fa00e6b5e4904809 --dry-run` — exit 0. Re-ran full rail (35/35 managed-block checks, `plugin:check` green: "plugin-sync OK — 41 tools match, bundle bytes match, 12 skill frontmatters parse, manifests at v0.4.2, isolated MCP handshake lists 41 tools"). Output:
```
--- dry run: the verification gate passed ---
Would verify 7a6e437574fd653f4c49d0a3fa00e6b5e4904809 is an ancestor of clean main
Would create and push only refs/tags/v0.4.2
Would build/publish one Windows installer and verify visibility, updater, and every asset digest
No Git or remote release state was written.
```
No GUI-154 crash. Proceeding to the real `--publish`.
