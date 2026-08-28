---
kind: proof-record
merged_sha: "d523a29365a20133fc5f0e16a29df40b1a80bd8e"
environment: "Detached worktree .worktrees/verify-core-128-d523a29365a20133fc5f0e16a29df40b1a80bd8e at d523a29365a20133fc5f0e16a29df40b1a80bd8e; Windows 11 Pro 26200, Node v24.15.0, npm 11.14.1; deps installed with npm ci"
verified_at: "2026-08-28T07:46:13Z"
result: FAIL
failure_class: implementation
attempts:
  - attempted_at: "2026-08-28T07:23:00Z"
    command: "npm ci"
    cwd: ".worktrees/verify-core-128-d523a29365a20133fc5f0e16a29df40b1a80bd8e"
    exit_code: 0
    result: PASS
    summary: "Workspace dependencies installed cleanly in the detached verification worktree."
  - attempted_at: "2026-08-28T07:25:21Z"
    command: "npm run verify"
    cwd: ".worktrees/verify-core-128-d523a29365a20133fc5f0e16a29df40b1a80bd8e"
    exit_code: 1
    result: FAIL
    summary: "The authoritative rail died at step 2 of 12 (`npm test`) after 9m00s. 15 failures in scripts/verify-skill-prose.test.mjs, every one `ReferenceError: rmSync is not defined`. Deterministic, not load-sensitive."
  - attempted_at: "2026-08-28T07:34:30Z"
    command: "npm run test:scripts"
    cwd: ".worktrees/verify-core-128-d523a29365a20133fc5f0e16a29df40b1a80bd8e"
    exit_code: 1
    result: FAIL
    summary: "Isolated reproduction: exactly 15 `ReferenceError: rmSync is not defined`, one per surviving bare `rmSync(` call site in scripts/verify-skill-prose.test.mjs."
  - attempted_at: "2026-08-28T07:35:05Z"
    command: "npm run test -w @kanmer/core"
    cwd: ".worktrees/verify-core-128-d523a29365a20133fc5f0e16a29df40b1a80bd8e"
    exit_code: 0
    result: PASS
    summary: "23 test files, 562/562 passed in 119.73s. Includes the unchanged stale-lock cases in io.test.ts that gate lock recovery on owner liveness and identity."
  - attempted_at: "2026-08-28T07:37:07Z"
    command: "npm run test -w @kanmer/gui"
    cwd: ".worktrees/verify-core-128-d523a29365a20133fc5f0e16a29df40b1a80bd8e"
    exit_code: 0
    result: PASS
    summary: "54 test files, 524/524 passed in 401.27s, exit 0. No unhandled `EPERM: … watch` rejection — cause 6 (index.sync.test.ts closeProject) is genuinely fixed."
  - attempted_at: "2026-08-28T07:43:50Z"
    command: "npm run test:http -w @kanmer/mcp-server"
    cwd: ".worktrees/verify-core-128-d523a29365a20133fc5f0e16a29df40b1a80bd8e"
    exit_code: 0
    result: PASS
    summary: "Exit 0 in 45s."
  - attempted_at: "2026-08-28T07:44:40Z"
    command: "node --test scripts/antigravity-plugin-config.test.mjs"
    cwd: ".worktrees/verify-core-128-d523a29365a20133fc5f0e16a29df40b1a80bd8e"
    exit_code: 0
    result: PASS
    summary: "4 pass, 0 fail, **skipped 0**, under an agent harness. Both `cmd.exe` tests genuinely executed (79.9 ms / 66.5 ms); the reason-carrying conditional skip did not fire. Cause 3 fixed by removing NoDefaultCurrentDirectoryInExePath from the child env, not by skipping."
  - attempted_at: "2026-08-28T07:45:10Z"
    command: "npm run typecheck; npm run verify:docs; npm run verify:skills; npm run verify:agents-block; npm run plugin:check; npm run mcpb:check"
    cwd: ".worktrees/verify-core-128-d523a29365a20133fc5f0e16a29df40b1a80bd8e"
    exit_code: 0
    result: PASS
    summary: "All six remaining rail steps pass individually (exit 0 each), isolating the rail failure to scripts/verify-skill-prose.test.mjs alone."
  - attempted_at: "2026-08-28T07:30:00Z"
    command: "gh run view 33151189671 --job 98783311973 --log-failed"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: FAIL
    summary: "Hosted CI at the exact merge SHA: workflow 'Pull request verification' conclusion=failure. verify job failed identically — `rmSync is not defined`, tests 136, pass 121, fail 15, skipped 0. Independent confirmation on a second host."
  - attempted_at: "2026-08-28T07:28:00Z"
    command: "git diff -U0 d523a293^1 d523a293 | grep '^-[^-]' | grep -E 'expect\\(|assert\\.|assert\\(|\\.toBe|\\.toEqual|\\.toThrow|\\.rejects|\\.resolves'"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: "Assertion-integrity sweep of the removed side of all 52 changed files returns exactly one line, whose added counterpart differs only in the hang-guard constant 1_000 -> 30_000 inside a Promise.race. Matcher unchanged."
---

# Proof — CORE-128

Verified independently at the exact merge SHA. I did not write or review this code.

## Result

**FAIL — `failure_class: implementation`.** Retryable in the ordinary sense, but not by
rerunning: the failure is deterministic and needs a code change.

This is the one ticket whose deliverable *is* a green rail. At
`d523a29365a20133fc5f0e16a29df40b1a80bd8e` the rail is red, on this Windows host and on the
hosted runner, on every run.

## The failure

`npm run verify` dies at step 2 of 12 (`npm test`) with 15 failures in
`scripts/verify-skill-prose.test.mjs`, all `ReferenceError: rmSync is not defined`.

At the merge SHA that file imports

```js
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { removeTreeWithRetrySync } from "../packages/core/dist/index.js";
```

— `rmSync` is gone from the import list — while 15 `rmSync(fixture, { recursive: true, force: true })`
call sites survive at lines 363, 379, 398, 416, 439, 506, 522, 535, 552, 569, 586, 599, 616,
638 and 670. Fifteen call sites, fifteen failures.

### How it arose

PR #300 was **squash-merged**, so `d523a293` has a single parent, `70d23efd`. On that parent
the file imports `rmSync` and has 25 bare call sites. The CORE-128 branch was written against
an older `main` where only 10 existed; SKILL-036 (`70d23efd`, goal orchestration) added 15 more
while the branch was in flight. The squash applied the branch's import line — correctly dropping
`rmSync` — and converted only the 10 call sites the branch knew about. Git merged both changes
cleanly because they touch different lines. The result is a semantic merge conflict that
compiles and only fails at runtime.

### Disposition of the review's F-005

The review recorded this as **F-005**, "SKILL-036 landed 15 new bare `rmSync` in
`verify-skill-prose.test.mjs` after this branch converted it — drift already on `main`", and
dispositioned it **accepted risk / cosmetic drift**. That disposition is wrong. It is not style
drift: the branch removed the binding those 15 statements resolve against, so they are 15 hard
`ReferenceError`s. This is the finding that should have blocked the merge.

The fix is one line — restore `rmSync` to the `node:fs` import, or convert the 15 sites to
`removeTreeWithRetrySync` for consistency with the rest of the ticket.

## What the ticket did get right

The failure above is unrelated to the ticket's substance. Every one of the six causes is
genuinely fixed, and the fix made the rail **more honest, not quieter**:

- **Assertion integrity is clean.** The removed side of all 52 changed files yields exactly one
  assertion line; its added counterpart changes only a `Promise.race` hang-guard constant
  (`1_000` -> `30_000`) with the matcher `/TUNNEL_CHILD_EXITED_BEFORE_READY/` intact. No test
  case was deleted: every changed test file has an identical `test(`/`it(` count on both sides.
  Both `timeoutMs: 5` cases that *assert* a timeout — `readiness.test.mjs:118`
  (`TUNNEL_READINESS_TIMEOUT`) and `doctor.test.mjs:75` — are byte-identical across the merge.
  Every raised budget is a process-spawn timeout, a hang guard, or a vitest test/hook budget;
  none sits in a test that asserts a timeout fires, so none can mask a regression.
- **The only new `.skip` does not fire.** `node --test scripts/antigravity-plugin-config.test.mjs`
  reports 4 pass, **skipped 0** in this agent shell, with both `cmd.exe` tests running in 79.9 ms
  and 66.5 ms. They failed 100 % under an agent before.
- **`packages/core/src/io.ts` is purely additive** — 50 insertions, 0 deletions — so the lock
  implementation, `recoverStaleLock`, `DEFAULT_LOCK_RETRY_MS` and `DEFAULT_LOCK_STALE_MS` are
  byte-unchanged. The 32 145 ms ladder is opt-in per call site.
- **Core 562/562, GUI 524/524, `test:http`, and the six remaining rail steps all exit 0.**
  The GUI suite raises no unhandled `EPERM: … watch` rejection, so cause 6 is fixed.

### Stale-lock safety

The `ORPHAN_MIGRATION_LOCK_RETRY_MS` ladder is `[10, 25, 60, 150, 300, 600, 1_000, 2_000, 3_000,
5_000 x5]` = **32 145 ms over 14 steps**, which exceeds `DEFAULT_LOCK_STALE_MS` (30 000 ms). It
cannot steal a live lock. Established **by close reading and by execution**.

Close reading of `recoverStaleLock` (`packages/core/src/io.ts:314`) shows age is necessary but
never sufficient — it is a gate, not a decision:

1. `if (Math.max(0, persistedAge, filesystemAge) < staleAfterMs) return false;` — age only.
2. `ownerMarkerActive(...)` -> `return false` while the owner marker is live.
3. `alive = processAlive(record.pid); if (alive && record.identity) alive = currentIdentity === undefined || currentIdentity === record.identity;` then `if (alive) return false;`

So a waiter that has spent 32 s in the ladder still declines to reclaim unless the recorded owner
process is **dead**, or PID reuse is **proven** by an identity mismatch. Identity that cannot be
obtained (`currentIdentity === undefined`) keeps `alive` true, and any throw in the probe
`return false`s — both fail **closed**, exactly as the comment claims. `stillOwnsStaleLock()`
re-reads contents, `dev`, `ino` and `mtimeMs` and re-runs the liveness and marker checks before
the quarantine rename, which is the atomic ownership transition.

By execution, `packages/core/src/io.test.ts` — whose diff is teardown-only — carries
"recovers a stale lock only when the recorded owner is dead", "reclaims a stale lock when the
recorded PID was reused" and "fails closed when a live owner's identity cannot be inspected".
All pass in the 562/562 core run above.

## Known findings — confirmed at the merge SHA

| ID | Confirmed | Note |
|---|---|---|
| F-001 | Yes | `shimUnreachable` matches only `/is not recognized as an internal or external command/i`, the launcher-regression signature. The primary guard is unconditional: `validate()` does `assert.deepEqual(entry.args, expected)` against the shipped `plugins/kanmer/mcp_config.json` in a test with no skip, so it fails closed. Accepted risk stands. |
| F-002 | Yes | `io.ts:661` claims "~1 s of patience" for `10 x 100 ms`. Node's rimraf uses `retryDelay * i`, so the real budget is `100 x (1+…+10)` = **5 500 ms**. Bounded and safe; the comment's arithmetic is wrong. |
| F-003 | Yes | `cloudflared.test.mjs:317` races an uncleared `setTimeout(…, 30_000)`; the losing timer is never `clearTimeout`-ed, so the `node:test` process stays alive for the full guard after a fast pass. `supervisor.test.mjs:11-25` next door has the correct `finally { clearTimeout(timer); }`. Cost only. |
| F-004 | Yes | `AGENTS.md` §8 has two items numbered `20` (lines 661 and 664). Cosmetic. |
| F-005 | Yes — **and it is a blocker, not accepted risk** | See above. 15 bare `rmSync` with the import removed = 15 `ReferenceError`s. |
| F-006 | Not exercised | ~32 s block on GUI project open under contention is a real consequence of the ladder, but needs a contended GUI open to observe; not reachable from this rail. |
| F-007 | **Vindicated** | The 10-run streak was measured at `7061045b`, one commit behind. At the merge SHA the count is **0 of 1** — the rail fails deterministically. The gap F-007 named is exactly where the defect entered. |

## Clean `npm run verify` runs at the merge SHA

**0.** One full-rail run was executed end to end (exit 1). Rerunning was not attempted beyond
that because the failure is a missing binding, not a timing race: it reproduced identically in an
isolated `npm run test:scripts` (exit 1) and on the hosted runner (conclusion `failure`, same 15
failures). Repeating a deterministic failure to reach a count would be theatre, not evidence.

## Recommendation to the controller

Route back to Implementing for a one-line fix (restore `rmSync` to the `node:fs` import in
`scripts/verify-skill-prose.test.mjs`, or convert the 15 remaining call sites to
`removeTreeWithRetrySync`), then re-verify. `main` is currently red, so this also blocks every
other lane's rail.

Not filed as tickets — recommended only. The identity-probe stall is already filed as CORE-134,
outside HZN-008.
