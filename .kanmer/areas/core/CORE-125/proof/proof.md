---
kind: proof-record
merged_sha: "c6bbddd617f6c8caef782f43014ccb3dd6a7fdfa"
environment: "Detached verification worktree .worktrees/verify-core-125-c6bbddd617f6c8caef782f43014ccb3dd6a7fdfa (HEAD c6bbddd617f6c8caef782f43014ccb3dd6a7fdfa, symbolic-ref empty, status clean); Windows 11 Pro 10.0.26200, Node v24.15.0, npm ci exit 0 (647 packages); manual acceptance run against mkdtemp COPIES of the board only (C:\\Users\\Alex\\AppData\\Local\\Temp\\core125-sandbox-oHEtqJ and C:\\Users\\Alex\\AppData\\Local\\Temp\\core125-v312-MZyqbD); the live board worktree .worktrees/kanmer and the implementation worktree .worktrees/core-125 were never written."
verified_at: "2026-08-27T23:28:00Z"
result: PASS
attempts:
  - attempted_at: "2026-08-27T23:09:00Z"
    command: "gh pr view 296 --json state,mergeCommit,url"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: PASS
    summary: 'state MERGED, mergeCommit.oid c6bbddd617f6c8caef782f43014ccb3dd6a7fdfa, url https://github.com/collisionengineers/kanmer/pull/296 — matches the expected merge SHA exactly.'
  - attempted_at: "2026-08-27T23:09:20Z"
    command: "git worktree add --detach .worktrees/verify-core-125-c6bbddd617f6c8caef782f43014ccb3dd6a7fdfa c6bbddd617f6c8caef782f43014ccb3dd6a7fdfa"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: PASS
    summary: 'Worktree created. rev-parse HEAD = c6bbddd617f6c8caef782f43014ccb3dd6a7fdfa; symbolic-ref --short -q HEAD empty (exit 1 = detached); status --short --branch = "## HEAD (no branch)" with no dirty entries.'
  - attempted_at: "2026-08-27T23:09:30Z"
    command: "git diff --stat f3060b06..c6bbddd6"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: PASS
    summary: '4 files, 457 insertions / 254 deletions — AGENTS.md (2), packages/core/src/claims.test.ts (+118), packages/core/src/store.ts (337), plugins/kanmer/mcp/kanmer-mcp.cjs (254). Exactly the expected shape: core + AGENTS.md + regenerated bundle. Single commit c6bbddd6 in the range.'
  - attempted_at: "2026-08-27T23:10:17Z"
    command: "npm ci"
    cwd: ".worktrees/verify-core-125-c6bbddd617f6c8caef782f43014ccb3dd6a7fdfa"
    exit_code: 0
    result: PASS
    summary: "added 647 packages, audited 652 in 20s."
  - attempted_at: "2026-08-27T23:10:34Z"
    command: "npm run build"
    cwd: ".worktrees/verify-core-125-c6bbddd617f6c8caef782f43014ccb3dd6a7fdfa"
    exit_code: 0
    result: PASS
    summary: "core + mcp-server ESM/CJS build success; standalone kanmer-mcp.cjs, remote-cli.cjs, doctor-cli.cjs emitted."
  - attempted_at: "2026-08-27T23:10:54Z"
    command: "npm run typecheck"
    cwd: ".worktrees/verify-core-125-c6bbddd617f6c8caef782f43014ccb3dd6a7fdfa"
    exit_code: 0
    result: PASS
    summary: "@kanmer/core, @kanmer/mcp-server, @kanmer/ui, @kanmer/gui (node + web projects) all clean."
  - attempted_at: "2026-08-27T23:11:58Z"
    command: "npm test -w @kanmer/core"
    cwd: ".worktrees/verify-core-125-c6bbddd617f6c8caef782f43014ccb3dd6a7fdfa"
    exit_code: 0
    result: PASS
    summary: "19 test files passed, 420 tests passed (0 failed), duration 48.23 s. Matches the expected 420 / 19 exactly. No hang in any nested-write suite."
  - attempted_at: "2026-08-27T23:12:58Z"
    command: "node packages/mcp-server/src/smoke.mjs"
    cwd: ".worktrees/verify-core-125-c6bbddd617f6c8caef782f43014ccb3dd6a7fdfa"
    exit_code: 0
    result: PASS
    summary: "306/306 checks passed — the expected count."
  - attempted_at: "2026-08-27T23:13:04Z"
    command: "npm run smoke:protocol"
    cwd: ".worktrees/verify-core-125-c6bbddd617f6c8caef782f43014ccb3dd6a7fdfa"
    exit_code: 0
    result: PASS
    summary: "50/50 checks passed — the expected count."
  - attempted_at: "2026-08-27T23:13:08Z"
    command: "npm run plugin:check"
    cwd: ".worktrees/verify-core-125-c6bbddd617f6c8caef782f43014ccb3dd6a7fdfa"
    exit_code: 0
    result: PASS
    summary: "plugin-sync OK — 39 tools match, bundle bytes match, 12 skill frontmatters parse, manifests at v0.3.12, isolated MCP handshake lists 39 tools. Confirms the committed bundle is the one this core builds."
  - attempted_at: "2026-08-27T23:13:36Z"
    command: "npm run test:http -w @kanmer/mcp-server"
    cwd: ".worktrees/verify-core-125-c6bbddd617f6c8caef782f43014ccb3dd6a7fdfa"
    exit_code: 0
    result: PASS
    summary: "tests 124, pass 124, fail 0, duration 20.5 s. No spawn ETIMEDOUT and no tunnels/readiness timeout on this run."
  - attempted_at: "2026-08-27T23:20:43Z"
    command: "npm run verify"
    cwd: ".worktrees/verify-core-125-c6bbddd617f6c8caef782f43014ccb3dd6a7fdfa"
    exit_code: 1
    result: FAIL
    summary: >-
      Known host quirk only, recorded exactly and not chased. core 19/19 files passed;
      apps/gui 53/53 files passed; mcp-server http suite 124 pass / 0 fail; scripts suite
      121 tests, 119 pass, 2 fail. The two failures are the documented antigravity EBUSY
      pair — scripts\antigravity-plugin-config.test.mjs:47 "the quote-free launcher still
      reaches the shim when LOCALAPPDATA contains spaces" (5084 ms) and :73 "the shipped
      installer shim restores the provider cwd before MCP launch" (5116 ms), both
      "EBUSY: resource busy or locked, rmdir ...\\Kanmer Test Space\\Kanmer\\bin" (errno
      -4082). None of the other listed host quirks (core 5 s timeouts, http.test.mjs spawn
      ETIMEDOUT, tunnels/readiness.test.mjs timeout, apps/gui kanmerGit hook timeouts)
      occurred on this run. Hosted verify is authoritative — see the next two attempts.
  - attempted_at: "2026-08-27T23:08:55Z"
    command: "gh run list --commit c6bbddd617f6c8caef782f43014ccb3dd6a7fdfa  (attempt 1 of the push-to-main run 33125115671)"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: FAIL
    summary: >-
      The push-to-main "Pull request verification" run 33125115671 at the merge SHA FAILED
      on its first attempt (1m39s). Job verify, step "Run the authoritative verification
      rail": src/store.test.ts > KanmerStore > "updates fields and stamps updated" —
      "Error: Test timed out in 5000ms", followed by a teardown "ENOTEMPTY: directory not
      empty, rmdir 'C:\\Users\\RUNNER~1\\AppData\\Local\\Temp\\kanmer-test-dDGpS8\\.kanmer'".
      Test Files 1 failed | 18 passed (19); Tests 1 failed | 419 passed (420). Recorded in
      full rather than hidden. Investigated below (see "The hosted first-attempt failure").
  - attempted_at: "2026-08-27T23:12:20Z"
    command: "gh run rerun 33125115671 --failed  (then gh run view 33125115671 --json status,conclusion,jobs)"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: PASS
    summary: >-
      Rerun of the failed verify job at the same merge SHA c6bbddd6 completed SUCCESS in
      5m17s; run conclusion is now success (verify success, regate success, kanmer-gate
      skipped because it is a pull_request-only job). The same test that timed out passed.
      Combined with the clean local core run (420/420) this establishes the first attempt
      as a hosted Windows-runner timing flake in the documented "core 5 s timeouts" class,
      not a regression.
  - attempted_at: "2026-08-27T23:09:10Z"
    command: "gh run view 33124151447 --json displayTitle,status,conclusion,headSha,jobs"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: PASS
    summary: 'PR-head run 33124151447 at 437772d47c47d9ccd5bdaedf818976b287ba6f4e: conclusion success; job "verify" success, job "kanmer-gate" success (phase-2 merge gate), job "regate" success.'
  - attempted_at: "2026-08-27T23:22:57Z"
    command: >-
      MANUAL (a) cross-process exclusion — two separate node processes against one mkdtemp
      board copy: `node harness/renewer.mjs <sandbox> CORE-129 6000 renew.jsonl` and
      `node harness/updater.mjs <sandbox> CORE-129 6000`, both importing
      .worktrees/verify-core-125-<sha>/packages/core/dist/index.js
    cwd: "C:\\Users\\Alex\\AppData\\Local\\Temp\\core125-sandbox-oHEtqJ"
    exit_code: 0
    result: PASS
    summary: >-
      6 s of true cross-process contention on one ticket file. Renewer (process 1) looped
      getItem + renewTicket with the lease id/revision it had just read; updater (process
      2, a separate OS process and a separate KanmerStore) looped updateItem with NO
      expectedUpdated — the unprotected path CORE-125 exists to fix. Both processes exited
      0. Renewer: {"ok":119,"conflict":0,"other":0}. Updater: {"ok":173,"err":0,"errs":[]}.
      Final CORE-129.md holds a fully coherent single-generation lease record —
      lease_id 0d8b7ff0-2c69-482d-970a-5d82304e5c96 (the ONLY lease id ever observed),
      lease_revision 120 (= 1 initial + 119 renewals; the renew log is strictly monotonic
      with no repeat or regression), claim_expires_at 2026-08-27T23:52:57.333Z and
      lease_heartbeat_at 2026-08-27T23:22:57.333Z both from that same final generation and
      matching the last logged renewal byte for byte. The concurrent field write also
      survived (title "hammered-173", the updater's last write), so neither side lost a
      write. Residue scan over the whole board copy for *.lock, *.lock.owner-*,
      *.lock.stale-* and *.tmp-*: 0 files.
  - attempted_at: "2026-08-27T23:23:47Z"
    command: >-
      MANUAL (b) no deadlock under nesting — `node harness/nesting.mjs <sandbox>` with a
      hard 30 s watchdog that exits 97 on a hang
    cwd: "C:\\Users\\Alex\\AppData\\Local\\Temp\\core125-sandbox-oHEtqJ"
    exit_code: 0
    result: PASS
    summary: >-
      Both nested-write paths completed; the watchdog never fired. (b1) Audited backward
      move review -> implementing with reason "operator: manual acceptance backward move
      (CORE-125)" on CORE-130 — the CORE-121 path where updateItem holds the write lock and
      appendTransition -> setDoc re-enters it — completed in 575 ms with status
      implementing, review_round 1, claim_controller verifier-a and the lease record
      intact (lease_id 8755b4af-..., lease_revision 1). (b2) transferTicket on an EXPIRED
      claim (CORE-132's claim_expires_at hand-set to 2026-08-27T22:23:47.021Z, one hour in
      the past) — the path where a lease verb holds the lock and calls appendTransition ->
      setDoc — completed in 52 ms, reassigning to verifier-c with a fresh lease_id
      64fb2ee6-... at lease_revision 2 and a new claim_expires_at 2026-08-27T23:53:47.038Z.
      No hang, so the AsyncLocalStorage re-entrancy guard holds on both nesting shapes.
  - attempted_at: "2026-08-27T23:24:36Z"
    command: >-
      MANUAL (c) stale-lock reclaim and fresh-lock refusal — `node harness/stale.mjs
      <sandbox>` with a 60 s watchdog
    cwd: "C:\\Users\\Alex\\AppData\\Local\\Temp\\core125-sandbox-oHEtqJ"
    exit_code: 0
    result: PASS
    summary: >-
      (c1) Crashed holder does NOT wedge the board. A .kanmer/leases.lock was hand-written
      carrying a genuinely dead pid (14552, a child spawned and reaped) with createdAt and
      mtime set 90 s in the past — older than the 30 s DEFAULT_LOCK_STALE_MS window. An
      ordinary updateItem("CORE-131", {title}) then SUCCEEDED in 523 ms and the stale lock
      file was gone afterwards (lock_still_present false). (c2) Fresh lock is respected, not
      silently overwritten. A live helper process (pid 3856) was spawned and a lock record
      naming it written with createdAt = now. The competing updateItem failed loudly after
      2246 ms — matching the documented ~2.145 s DEFAULT_LOCK_RETRY_MS budget — throwing
      code EEXIST: "EEXIST: file already exists, link '...\\.leases.lock.tmp-47408-22' ->
      '...\\leases.lock'". The ticket was NOT modified: title before and after both
      "reclaimed-after-stale-lock". No leases.lock, owner-marker or tmp residue remained
      after cleanup. Observation (not a defect against this ticket's scope): the refusal
      surfaces as a raw errno EEXIST from the lock layer rather than a domain-coded
      retryable error, so a caller must match on the code rather than a Kanmer error class.
  - attempted_at: "2026-08-27T23:26:52Z"
    command: >-
      MANUAL (d) v0.3.12 compatibility — `node drive.mjs <copy2>` driving the INSTALLED
      stable server C:\\Users\\Alex\\AppData\\Local\\Programs\\Kanmer\\resources\\plugins\\kanmer\\mcp\\kanmer-mcp.cjs
      over stdio JSON-RPC against a second board copy that has a live-held .kanmer/leases.lock
      and a .leases.lock.owner-<token> marker planted in it
    cwd: "C:\\Users\\Alex\\AppData\\Local\\Temp\\core125-v312-MZyqbD"
    exit_code: 0
    result: PASS
    summary: >-
      The installed stable server is not broken by the presence of lock files. Banner
      "kanmer-mcp ready — root: ...core125-v312-MZyqbD (flag), repo: ... (derived), build:
      plugin v0.3.12 sha 639df4cf"; initialize returned serverInfo {name kanmer, version
      0.3.12}; tools/list 37 tools. READS with the lock files present: get_status ok
      (rootSource flag, 364 tickets, byStage done 346 / verifying 5 / backlog 11, taken 14),
      list_items status=verifying ok (5 items), get_item CORE-125 ok (status verifying).
      WRITES with the lock files present: create_item ok (CORE-128), update_item ok (title
      "v0.3.12 wrote this with leases.lock present"), set_ticket_doc plan ok (version
      657bdff94bb3dd60), and a get_item read-back confirmed both the title and docs.plan
      true. No isError on any call, nothing on stderr beyond the ready banner. The board
      file format is unchanged and the lock files are inert to a server that does not take
      them.
---

# Proof — CORE-125

Verified at the exact GitHub merge commit of PR #296,
**c6bbddd617f6c8caef782f43014ccb3dd6a7fdfa**, in the disposable detached
worktree `.worktrees/verify-core-125-c6bbddd617f6c8caef782f43014ccb3dd6a7fdfa`.
No mutable checkout was updated by this verification; the board worktree
`.worktrees/kanmer` and the implementation worktree `.worktrees/core-125` were
never written.

## What was verified

`.kanmer/leases.lock` is now the board-wide **write** lock for every ticket-file
mutation — `updateItem`, `setDoc`, `appendScratch` and the writes `moveItem`
causes, in addition to the four lease verbs — made re-entrant within one async
execution context by a module-level `AsyncLocalStorage<ReadonlySet<string>>` of
held lock-file paths (`packages/core/src/store.ts`). This is an ownership-safety
keystone, so it was verified as behaviour and not only as a passing suite.

The shipped range is exactly the expected shape: `git diff --stat
f3060b06..c6bbddd6` is 4 files — `packages/core/src/store.ts`,
`packages/core/src/claims.test.ts`, `AGENTS.md` and the regenerated
`plugins/kanmer/mcp/kanmer-mcp.cjs`. `plugin:check` confirms the committed
bundle matches this core byte for byte at 39 tools.

## Deterministic checks

| Command | Exit | Result |
|---|---|---|
| `npm ci` | 0 | 647 packages |
| `npm run build` | 0 | core + mcp-server + standalone bundles |
| `npm run typecheck` | 0 | all four workspaces |
| `npm test -w @kanmer/core` | 0 | **19 files, 420 tests**, 48.23 s — the expected counts |
| `node packages/mcp-server/src/smoke.mjs` | 0 | **306/306** |
| `npm run smoke:protocol` | 0 | **50/50** |
| `npm run test:http -w @kanmer/mcp-server` | 0 | 124/124 |
| `npm run plugin:check` | 0 | **39 tools**, bundle bytes match |
| `npm run verify` | 1 | known antigravity EBUSY ×2 only (below) |

`npm run verify` exit 1 is the documented host quirk and nothing else: core
19/19 files, apps/gui 53/53 files, mcp http 124 pass / 0 fail, scripts 119
pass / 2 fail, the two being
`scripts\antigravity-plugin-config.test.mjs:47` and `:73` with
`EBUSY: resource busy or locked, rmdir ...\Kanmer Test Space\Kanmer\bin`
(errno −4082). Recorded exactly, not chased. None of the other listed host
quirks (core 5 s timeouts, `http.test.mjs` spawn ETIMEDOUT,
`tunnels/readiness.test.mjs` timeout, apps/gui kanmerGit hook timeouts) fired on
this run.

## The hosted first-attempt failure

This is recorded rather than smoothed over. The push-to-main run at the merge
SHA, **33125115671**, **failed on its first attempt** (1m39s) in
`src/store.test.ts > KanmerStore > "updates fields and stamps updated"` with
`Test timed out in 5000ms`, plus a consequent teardown
`ENOTEMPTY: directory not empty, rmdir '...\kanmer-test-dDGpS8\.kanmer'` —
419 passed, 1 failed of 420.

That is exactly the class of failure this ticket had to be interrogated for: a
5 s timeout on a plain `createItem` + `moveItem` would be the signature of a
lock the re-entrancy guard failed to short-circuit (a lost `AsyncLocalStorage`
context makes a nested acquire burn the whole ~2.145 s retry schedule before
throwing). Three independent lines of evidence say it was a runner flake:

1. The **rerun of that same job at that same SHA completed success** (5m17s);
   run 33125115671 now concludes success.
2. The local core suite at the merge SHA is **420/420, exit 0**, with no
   5 s-class timeout anywhere.
3. A retry-storm would have thrown `EEXIST` after ~2.1 s, not hung to a 5 s
   timeout, and the `ENOTEMPTY` is a consequence of vitest aborting the test
   mid-write rather than independent evidence. Manual attempt (b) drives both
   nesting shapes directly and they complete in 575 ms and 52 ms.

The PR-head run **33124151447** at `437772d4` was green on both `verify` and
`kanmer-gate`.

## Manual acceptance — what the unit tests cannot prove

All four ran against `mkdtemp` **copies** of `.worktrees/kanmer/.kanmer`. The
live board was read once to make the copies and never written.

**(a) Cross-process exclusion — PASS.** Two *separate OS processes* (not two
stores in one process), each importing the built
`packages/core/dist/index.js`, hammered one ticket for 6 s: one looping
`getItem` + `renewTicket`, the other looping `updateItem` with **no**
`expectedUpdated`. 119 renewals and 173 updates, **zero** errors and zero
conflicts on either side. The final ticket file holds one coherent generation —
`lease_id` `0d8b7ff0-2c69-482d-970a-5d82304e5c96` (the only id ever seen),
`lease_revision` 120 (= 1 + 119, strictly monotonic across the whole renewal
log, never reverted), and `claim_expires_at` / `lease_heartbeat_at` both
`…23:52:57.333Z` / `…23:22:57.333Z` from that same final renewal — while the
competing writer's last field edit (`title: hammered-173`) also survived.
Neither side lost a write. Residue scan of the whole copy for `*.lock`,
`*.lock.owner-*`, `*.lock.stale-*` and `*.tmp-*`: **0 files**.

**(b) No deadlock under nesting — PASS,** with a hard watchdog so a hang would
have been a failure, not an inconclusive. The audited backward move
`review → implementing` with an operator reason (`updateItem` holds the lock,
`appendTransition → setDoc` re-enters it) completed in **575 ms**; a
`transferTicket` on a deliberately expired claim (lease verb holds the lock,
`appendTransition → setDoc` re-enters it) completed in **52 ms**. Neither hung.

**(c) Stale-lock reclaim and fresh-lock refusal — PASS.** A hand-written
`leases.lock` naming a genuinely dead pid, with `createdAt` and mtime 90 s old
(past the 30 s stale window), did **not** wedge the board: a normal `updateItem`
succeeded in 523 ms and the stale lock was cleared. A *fresh* lock held by a
live process caused the competing `updateItem` to fail **loudly** after 2246 ms
— consistent with the ~2.145 s retry budget — with `EEXIST`, and the ticket was
provably not overwritten (title identical before and after). Worth noting for
callers: that refusal surfaces as a raw errno `EEXIST` from the lock layer, not
as a domain-coded retryable Kanmer error.

**(d) v0.3.12 compatibility — PASS.** The installed stable server
(`…\Programs\Kanmer\resources\plugins\kanmer\mcp\kanmer-mcp.cjs`, banner
`plugin v0.3.12 sha 639df4cf`, 37 tools) was driven over stdio JSON-RPC against
a second board copy in which a live-held `leases.lock` **and** an owner marker
had been planted. It read (`get_status` 364 tickets, `list_items`, `get_item
CORE-125`) and wrote (`create_item`, `update_item`, `set_ticket_doc`, verified
by read-back) with no `isError` on any call and nothing on stderr beyond its
ready banner. Lock files are inert to a server that does not take them; the
board file format is unchanged.

## Scope note

The failing-first counterfactual (that this race actually loses a write on the
pre-fix tree) is **not** re-run here; it is carried by the recorded
failing-first evidence in the post-implementation report and by the three
`claims.test.ts` cases that ship in this commit. What is proved above is the
post-fix behaviour under real cross-process contention, nesting, stale and live
locks, and against the previous stable server.

## Residual risks carried forward (not defects of this ticket)

- Every board write now costs a lock cycle (~+11 ms/call on this host, per the
  author's benchmark). `computeOrder` is deliberately outside the critical
  section, so a large positional move interleaves rather than holding the lock.
- The re-entrancy guard is async-context-scoped: a future fire-and-forget write
  started inside a critical section and awaited outside it would inherit "held"
  and skip locking. No such caller exists today.
- `deleteItem` still has no CAS and is deliberately out of scope; it deserves
  its own ticket.
- Lock contention surfaces as raw `EEXIST` rather than a domain-coded retryable
  error (see (c)).

## Closeout

- Merged PR: https://github.com/collisionengineers/kanmer/pull/296
- Merge date: 2026-08-27 (merged_sha c6bbddd617f6c8caef782f43014ccb3dd6a7fdfa, mergedAt 2026-08-27T23:07:13Z)
