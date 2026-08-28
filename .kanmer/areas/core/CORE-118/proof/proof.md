---
kind: proof-record
merged_sha: "0f4a21fefc3788a4b8c19c7c550e52e0ab8d5ab2"
environment: "Detached verification worktree .worktrees/verify-core-118-0f4a21fefc3788a4b8c19c7c550e52e0ab8d5ab2 at 0f4a21fefc3788a4b8c19c7c550e52e0ab8d5ab2 (symbolic-ref empty, status clean); Windows 11 Pro 10.0.26200; node v24.15.0; npm 11.14.1; dependencies from npm ci in that worktree. Manual acceptance driven against the worktree's built server (packages/mcp-server/dist/index.js, build dev-esm v0.3.12 sha f6f2c8e4) over stdio, rooted on mkdtemp COPIES of .worktrees/kanmer/.kanmer only; the live board was never opened for write."
verified_at: "2026-08-28T00:45:00Z"
result: PASS
attempts:
  - attempted_at: "2026-08-28T01:10:30+01:00"
    command: "gh pr view 297 --json state,mergeCommit,url"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: 'state MERGED, mergeCommit.oid 0f4a21fefc3788a4b8c19c7c550e52e0ab8d5ab2, url https://github.com/collisionengineers/kanmer/pull/297 — matches the expected merge SHA exactly.'
  - attempted_at: "2026-08-28T01:11:00+01:00"
    command: "git fetch origin"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: 'Fetch clean. git log --format=%H %P -1 0f4a21fe confirms the sole parent is c6bbddd617f6c8caef782f43014ccb3dd6a7fdfa, so c6bbddd6 is the exact pre-change state.'
  - attempted_at: "2026-08-28T01:11:30+01:00"
    command: "git worktree add --detach .worktrees/verify-core-118-0f4a21fefc3788a4b8c19c7c550e52e0ab8d5ab2 0f4a21fefc3788a4b8c19c7c550e52e0ab8d5ab2"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: 'Created detached at 0f4a21fe. 554 files checked out. .worktrees/kanmer, .worktrees/core-118 and .worktrees/core-128 were not touched.'
  - attempted_at: "2026-08-28T01:11:45+01:00"
    command: "git -C <verify-wt> rev-parse HEAD; git -C <verify-wt> symbolic-ref --short -q HEAD; git -C <verify-wt> status --short --branch"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: 'HEAD=0f4a21fefc3788a4b8c19c7c550e52e0ab8d5ab2; symbolic-ref empty (detached); status "## HEAD (no branch)" with no modified or untracked entries. Re-asserted identical at the end of the run.'
  - attempted_at: "2026-08-28T01:12:41+01:00"
    command: "npm ci"
    cwd: ".worktrees/verify-core-118-0f4a21fefc3788a4b8c19c7c550e52e0ab8d5ab2"
    exit_code: 0
    result: PASS
    summary: 'added 647 packages, audited 652 in 22s. Deprecation and audit warnings only.'
  - attempted_at: "2026-08-28T01:13:01+01:00"
    command: "npm run build"
    cwd: ".worktrees/verify-core-118-0f4a21fefc3788a4b8c19c7c550e52e0ab8d5ab2"
    exit_code: 0
    result: PASS
    summary: 'Core plus both server builds emitted. ESM build success; standalone CJS kanmer-mcp.cjs / remote-cli.cjs / doctor-cli.cjs emitted without error.'
  - attempted_at: "2026-08-28T01:13:25+01:00"
    command: "npm run typecheck"
    cwd: ".worktrees/verify-core-118-0f4a21fefc3788a4b8c19c7c550e52e0ab8d5ab2"
    exit_code: 0
    result: PASS
    summary: 'All workspaces type-check: @kanmer/mcp-server, @kanmer/ui, @kanmer/gui (tsconfig.node.json and tsconfig.web.json). No output.'
  - attempted_at: "2026-08-28T01:14:55+01:00"
    command: "npm test -w @kanmer/core"
    cwd: ".worktrees/verify-core-118-0f4a21fefc3788a4b8c19c7c550e52e0ab8d5ab2"
    exit_code: 0
    result: PASS
    summary: 'Test Files 21 passed (21); Tests 465 passed (465); duration 64.95s. Matches the expected 465 exactly. No 5 s timeout quirk observed on this run.'
  - attempted_at: "2026-08-28T01:16:51+01:00"
    command: "node packages/mcp-server/src/smoke.mjs"
    cwd: ".worktrees/verify-core-118-0f4a21fefc3788a4b8c19c7c550e52e0ab8d5ab2"
    exit_code: 0
    result: PASS
    summary: '320/320 checks passed. Matches the expected 320 exactly.'
  - attempted_at: "2026-08-28T01:16:55+01:00"
    command: "git diff --stat c6bbddd6..0f4a21fe"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: '14 files changed, 2667 insertions(+), 109 deletions(-). Adds packages/core/src/plan.ts (735), plan.test.ts (331), step-packet.ts (253), step-packet.test.ts (237); modifies core/src/index.ts, mcp-server execution-packet.ts and index.ts, smoke.mjs, the committed plugin bundle, three skill files, the plan template and AGENTS.md. Confirms NO packages/core/src/store.ts change, no gates/profiles/types change, no board-format file touched.'
  - attempted_at: "2026-08-28T01:17:18+01:00"
    command: "npm run smoke:protocol"
    cwd: ".worktrees/verify-core-118-0f4a21fefc3788a4b8c19c7c550e52e0ab8d5ab2"
    exit_code: 0
    result: PASS
    summary: '50/50 checks passed. Matches the expected 50 exactly.'
  - attempted_at: "2026-08-28T01:17:19+01:00"
    command: "npm run verify:skills"
    cwd: ".worktrees/verify-core-118-0f4a21fefc3788a4b8c19c7c550e52e0ab8d5ab2"
    exit_code: 0
    result: PASS
    summary: 'ALL CHECKS PASSED. The pinned plan-template headings, the single "## Stop condition" and the "not a gate" advisory survived the documentation edits.'
  - attempted_at: "2026-08-28T01:17:21+01:00"
    command: "npm run plugin:check"
    cwd: ".worktrees/verify-core-118-0f4a21fefc3788a4b8c19c7c550e52e0ab8d5ab2"
    exit_code: 0
    result: PASS
    summary: 'plugin-sync OK — 39 tools match, bundle bytes match, 12 skill frontmatters parse, manifests at v0.3.12, isolated MCP handshake lists 39 tools. Roster is unchanged at 39.'
  - attempted_at: "2026-08-28T01:17:47+01:00"
    command: "npm run test:http -w @kanmer/mcp-server"
    cwd: ".worktrees/verify-core-118-0f4a21fefc3788a4b8c19c7c550e52e0ab8d5ab2"
    exit_code: 0
    result: PASS
    summary: 'tests 124, pass 124, fail 0, duration 17.36s. Neither the http.test.mjs spawn ETIMEDOUT nor the tunnels/readiness.test.mjs timeout quirk reproduced on this run.'
  - attempted_at: "2026-08-28T01:13:05+01:00"
    command: "gh run list --commit 0f4a21fefc3788a4b8c19c7c550e52e0ab8d5ab2; gh run view 33128303637 --json conclusion,jobs"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: 'Push-to-main run 33128303637 "Pull request verification" on main, event push, completed success in 5m55s. Jobs: verify success (step "Run the authoritative verification rail" success, 00:01:31–00:07:01), regate success, kanmer-gate skipped (expected on push). This hosted rail is the authority for `npm run verify` at the exact merge SHA.'
  - attempted_at: "2026-08-28T01:15:00+01:00"
    command: "gh api repos/collisionengineers/kanmer/actions/runs?head_sha=924d7294...; gh run view 33127282091 --json conclusion,jobs"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: 'PR-head run 33127282091 for 924d7294c128f66c72dd1d8da6f01337cef9ab4b, event pull_request, run_attempt 2, completed success. Jobs: kanmer-gate success, verify success, regate skipped. The run_attempt 2 is the recorded gate rerun.'
  - attempted_at: "2026-08-28T01:24:18+01:00"
    command: "node %TEMP%/core118-acceptance.mjs — manual acceptance (b) step compilation, (c) derivation gaps, (d) step \"next\", (e) refusal ordering, driven over stdio against the worktree's built server on a mkdtemp COPY of .worktrees/kanmer/.kanmer"
    cwd: "C:/Users/Alex/AppData/Local/Temp (sandbox core118-accept-Lg0w0a)"
    exit_code: 0
    result: PASS
    summary: 'Board copy only; live board untouched. Sandbox fingerprint kanmer-proj-v1:c5e98fd4… (a copy, not the live kanmer-proj-v1:5dbaab31…). tools/list = 39. Full observed outputs in the body below.'
  - attempted_at: "2026-08-28T01:30:59+01:00"
    command: "git archive c6bbddd6 | tar -x -C %TEMP%/core118-baseline && npm ci && npm run build"
    cwd: "C:/Users/Alex/AppData/Local/Temp/core118-baseline"
    exit_code: 0
    result: PASS
    summary: 'Built a throwaway pre-change server at the exact merge parent c6bbddd6 for the backward-compatibility A/B. Exported with git archive rather than git worktree add, so no worktree was registered or removed. npm ci 0, npm run build 0.'
  - attempted_at: "2026-08-28T01:32:21+01:00"
    command: "node %TEMP%/core118-backcompat.mjs — manual acceptance (a) backward compatibility: identical board copy, identical fixtures, parent server c6bbddd6 vs merged server 0f4a21fe, get_execution_packet WITHOUT step"
    cwd: "C:/Users/Alex/AppData/Local/Temp (sandbox core118-ab-F7MON1)"
    exit_code: 0
    result: PASS
    summary: 'Ready packet deep-diff parent -> merged: added ["validation","groupContexts[0].version"]; removed []; changed []. Refusal packet deep-diff: added [], removed [], changed [] (byte-identical reason and missing). Both servers report 39 tools. On a deliberately poor plan the merged packet is ready:true with validation.ok true, blockers 0, advisories 18, every finding severity "advisory". OBSERVATION: ticket.revision was already present at the parent with the identical value "rev1:f12c32c857dd105d", so CORE-118 adds TWO additive fields, not the three named in the brief — strictly more conservative, nothing removed or changed.'
  - attempted_at: "2026-08-28T01:33:00+01:00"
    command: "node %TEMP%/core118-readonly.mjs — byte-level read-only proof of step mode on a board copy"
    cwd: "C:/Users/Alex/AppData/Local/Temp (sandbox core118-ro-KOKTap)"
    exit_code: 0
    result: PASS
    summary: 'Snapshotted all 5814 .kanmer tree entries (sha256 per file) plus data/activity.jsonl before and after a ready step:1 packet, a step:99 refusal and a step:"next" call. BOARD_TREE_IDENTICAL=true, ACTIVITY_LOG_IDENTICAL=true. Step mode persists nothing on either the ready or the refusal path.'
  - attempted_at: "2026-08-28T01:33:29+01:00"
    command: "npm run verify"
    cwd: ".worktrees/verify-core-118-0f4a21fefc3788a4b8c19c7c550e52e0ab8d5ab2"
    exit_code: 1
    result: FAIL
    summary: 'FIRST LOCAL ATTEMPT, RETAINED. Core 465/465 passed. apps/gui: Test Files 1 failed | 52 passed (53); Tests 1 failed | 519 passed (520). The single failure was src/main/kanmerGit.test.ts > "ensureBoardWorktree reconciliation > serializes concurrent orphan cleanup and leaves no quarantine residue" (10470ms, "expected false to be true"). This attempt was run while the verifier was concurrently spawning git worktrees and MCP servers on the same Windows host, so the run was self-contended; superseded by the two attempts below.'
  - attempted_at: "2026-08-28T01:36:23+01:00"
    command: "npx vitest run --no-file-parallelism src/main/kanmerGit.test.ts"
    cwd: ".worktrees/verify-core-118-0f4a21fefc3788a4b8c19c7c550e52e0ab8d5ab2/apps/gui"
    exit_code: 0
    result: PASS
    summary: 'Isolated rerun of the file that failed above: Test Files 1 passed (1); Tests 54 passed (54). Confirms the failure was host contention from the verifier''s own concurrent work, not a regression. CORE-118 touches no GUI and no Git code (see the diff --stat attempt).'
  - attempted_at: "2026-08-28T01:44:04+01:00"
    command: "npm run verify"
    cwd: ".worktrees/verify-core-118-0f4a21fefc3788a4b8c19c7c550e52e0ab8d5ab2"
    exit_code: 1
    result: FAIL
    summary: 'SECOND LOCAL ATTEMPT, run with nothing else competing. The kanmerGit failure did NOT recur: core Test Files 21 passed / Tests 465 passed; apps/gui Test Files 53 passed / Tests 520 passed. The only remaining failure is the tracked CORE-128 host quirk — test:scripts tests 121, pass 119, fail 2, both in scripts/antigravity-plugin-config.test.mjs: "the quote-free launcher still reaches the shim when LOCALAPPDATA contains spaces" and "the shipped installer shim restores the provider cwd before MCP launch", each EBUSY: resource busy or locked, rmdir on ...\\Kanmer Test Space\\Kanmer\\bin. Recorded exactly and not chased, per the CORE-128 disposition; the hosted rail at this merge SHA (run 33128303637) is the authority and passed.'
---

# Proof — CORE-118: Compile evidence-backed constrained plans into step packets

**Result: PASS.** Verified at the exact GitHub merge SHA
`0f4a21fefc3788a4b8c19c7c550e52e0ab8d5ab2` (PR #297, state `MERGED`) in a
disposable detached worktree. Every named deterministic check passed with its
expected count. The only non-zero local exit is `npm run verify`, and its sole
remaining failure is the pre-existing, separately tracked CORE-128 Windows host
quirk; the hosted authoritative rail at this same SHA passed.

## What shipped, confirmed at the SHA

`git diff --stat c6bbddd6..0f4a21fe` — 14 files, 2667 insertions, 109 deletions:

- Two new pure core modules: `packages/core/src/plan.ts` (`parsePlan`,
  `validatePlan`, plus `extractAtxSection` moved from the MCP package) and
  `packages/core/src/step-packet.ts` (`compileStepPacket`, version token
  `step-packet/1` — confirmed at runtime as `packetVersion: "step-packet/1"`).
- Surfaced through ONE optional `step` parameter on `get_execution_packet`.
  Observed tool schema: parent `["id","resume"]` → merged `["id","resume","step"]`.
- Tool roster is still **39** (`plugin:check`, `smoke.mjs`, `smoke:protocol`,
  and a live `tools/list` against both the parent and the merged server).
- **No `packages/core/src/store.ts` change**, no gates/profiles/types change, no
  board-format file touched, nothing persisted.

## Deterministic checks

| Check | Exit | Observed |
|---|---|---|
| `npm run build` | 0 | core + both server builds emitted |
| `npm run typecheck` | 0 | all four workspaces |
| `npm test -w @kanmer/core` | 0 | 21 files, **465/465** (expected 465) |
| `node packages/mcp-server/src/smoke.mjs` | 0 | **320/320** (expected 320) |
| `npm run smoke:protocol` | 0 | **50/50** (expected 50) |
| `npm run test:http -w @kanmer/mcp-server` | 0 | 124/124 |
| `npm run verify:skills` | 0 | ALL CHECKS PASSED |
| `npm run plugin:check` | 0 | 39 tools match, bundle bytes match |
| `npm run verify` (clean rerun) | 1 | CORE-128 quirk only — see below |

## Hosted evidence

- Push-to-main run **33128303637** for `0f4a21fefc3788a4b8c19c7c550e52e0ab8d5ab2`:
  `completed success`, 5m55s. Job `verify` success, step "Run the authoritative
  verification rail" success; job `regate` success; `kanmer-gate` skipped
  (expected on a push event).
- PR-head run **33127282091** for `924d7294c128f66c72dd1d8da6f01337cef9ab4b`:
  `run_attempt 2`, `completed success`, jobs `kanmer-gate` success and `verify`
  success — the recorded gate rerun.

## Known host quirks (CORE-128 — recorded, not chased)

`npm run verify` was run twice locally.

1. **First attempt, exit 1** — one GUI failure,
   `src/main/kanmerGit.test.ts > ensureBoardWorktree reconciliation >
   serializes concurrent orphan cleanup and leaves no quarantine residue`
   ("expected false to be true"). This attempt overlapped with the verifier's
   own concurrent `git worktree` and MCP-server work on the same host. Rerunning
   that file in isolation gave **54/54 pass, exit 0**, and the second full rail
   did not reproduce it (GUI 520/520). Attributed to host contention.
2. **Second attempt, exit 1** — with nothing else competing. Core 465/465 and
   GUI 520/520 both passed. The only failure is the tracked quirk:
   `scripts/antigravity-plugin-config.test.mjs` **EBUSY ×2**
   (`rmdir ...\Kanmer Test Space\Kanmer\bin`), test:scripts 119 pass / 2 fail.

The other quirks in the CORE-128 list (core 5 s timeouts, teardown ENOTEMPTY,
`http.test.mjs` spawn ETIMEDOUT, `tunnels/readiness.test.mjs` timeout) did not
reproduce on this host during this verification. No test was weakened or
skipped.

## Manual acceptance

All manual acceptance ran against the worktree's **built server** over stdio,
rooted on `mkdtemp` **copies** of `.worktrees/kanmer/.kanmer`. The live board was
never opened for write — the sandboxes reported fingerprint
`kanmer-proj-v1:c5e98fd4…`, distinct from the live `kanmer-proj-v1:5dbaab31…`.

### (a) Backward compatibility — PASS, with one correction to the brief

To isolate CORE-118 specifically, a pre-change server was built at the merge
commit's sole parent `c6bbddd6` and run against the *same* board copy with the
*same* fixtures. Deep JSON diff of `get_execution_packet` **without** `step`:

```
ready packet   parent -> merged:  added ["validation", "groupContexts[0].version"]
                                  removed []   changed []
refusal packet parent -> merged:  added []     removed []   changed []
```

Nothing was removed and no existing field value changed, on either the ready or
the refusal path. On a deliberately poor plan (missing sections, unresolved
vague language, no ordered steps) the merged packet is still
`ready: true` with `validation.ok: true`, **`blockers: 0`**, 18 advisories, and
every finding `severity: "advisory"` — so a bad plan cannot start refusing.

**Correction:** the brief expected *three* additive fields including
`ticket.revision`. Empirically `ticket.revision` was **already present at the
parent** with the identical value (`rev1:f12c32c857dd105d`); it came from
CORE-114, not this ticket. CORE-118 adds exactly **two**: `validation` and
`groupContexts[].version`. That is strictly more conservative than claimed and
does not weaken the acceptance criterion.

### (b) Step compilation — PASS

`get_execution_packet` with `step: 1` on a ticket whose plan has an
Expected-files table and ordered steps returned `ready: true` and a step block
drawn entirely from that plan:

```
packetVersion  "step-packet/1"
packetId       "731db03f341f6293"   (stable across two identical calls)
step           { index: 1, total: 2, id: "step-1", title: "Bound the retry loop" }
allowedFiles   ["src/queue.ts", "src/queue.test.ts"]
allowedSymbols ["enqueue", "QUEUE_MAX_RETRIES"]
forbiddenFiles ["src/vendor/bundle.js"]
tests          ["src/queue.test.ts"]
commands       ["npm test -w queue"]
expectedOutput "the retry suite passes with three attempts logged."
doneCondition  "`npm test -w queue` reports green."
deviationStop  "stop if the cap must become dynamic."
stopCondition  "Stop when the PR is open.\n\nComplete only this step, then stop and
                report. The controller reconciles the actual changes and evidence
                before another packet is issued; do not begin the next step, merge,
                or start another ticket."
evidence       ticket: research/research.md@9ea5faba74589184,
                       files/files.md@6b50c1c0faf8f997
plan           { path: "plan/plan.md", version: "b6312e1618712971" }
blockers       0
```

Evidence-pin staleness is genuinely enforced: reusing a plan whose pins no
longer match the live document versions produced
`PLAN_EVIDENCE_STALE`-class blockers naming both the pinned and the current
version.

### (c) The two derivation gaps — CONFIRMED as described

Both were reproduced empirically rather than taken on trust. One fixture plan
declared `## Do not modify` as the glob `apps/gui/**`, and an Expected-files
table containing `/etc/hosts` and `../other/x.ts`; step 1 named all three files.
`get_execution_packet` with `step: 1` returned:

```
ready          true
blockers       0        blockerCodes []
allowedFiles   ["apps/gui/main.ts", "/etc/hosts", "../other/x.ts"]
forbiddenFiles ["apps/gui/**"]
```

- A `## Do not modify` entry written as a glob (`apps/gui/**`) does **not**
  forbid `apps/gui/main.ts`. The forbidden list is compared as literal strings,
  so the glob matches nothing and the file compiles into `allowedFiles`.
- An Expected-files entry of `/etc/hosts` or `../other/x.ts` compiles into
  `allowedFiles` with **zero blockers** — absolute and parent-traversal paths
  are not rejected or normalised.

**Stated plainly: the step packet's containment is declarative, not enforced.**
`allowedFiles` and `forbiddenFiles` are advice transcribed from the plan for a
downstream worker to honour; the compiler does not glob-match, canonicalise, or
confine paths to the repository root. Both behaviours are dispositioned minor
and deferred to CORE-127, so neither is a verification failure here — but any
consumer that treats these lists as a sandbox boundary would be mistaken.

### (d) `step: "next"` — PASS

- Checklist `[x] Step 1`, `[ ] Step 2` → selected
  `{ index: 2, total: 2, id: "step-2", title: "Document the cap" }` with
  `allowedFiles ["docs/queue.md"]`. Correct step.
- Every box ticked → clean refusal, no throw: `ready: false`,
  `code: "GATE_BLOCKED"`, `missing: []`, no step block, reason
  *"Every ordered step is already ticked in the checklist; there is no next step
  to compile."*
- Plan with no ordered steps → clean refusal: *"The plan has no ordered steps,
  so there is no next step to compile."*
- Out-of-range `step: 9` → clean refusal with blocker `PLAN_STEP_NOT_FOUND`:
  *"The plan has 2 ordered step(s); step 9 does not exist."*

### (e) Refusal ordering — PASS, step refusal strictly last

| Fixture | `step` sent | Refusal actually given |
|---|---|---|
| Unmet leave-preparing gates | `1` | *"Execution is blocked by unmet leave-preparing requirements: research, files, plan, checklist."* `missing: [research, files, plan, checklist]`, no `validation` block |
| Unresolved questions | `1` | *"Execution is blocked by unresolved questions."* `missing: ["questions-resolved"]`, no `validation` block |
| Occupied by another actor | `1` | *"Ticket \"TICK-008\" is already taken by other-agent (branch other-branch, worktree .worktrees/other)."* `missing: []`, no step block |
| Same occupied ticket, resumed with the exact recorded branch and worktree | `9` | Only now does the step refusal surface: *"The plan cannot be compiled into a bounded step packet: … The plan has 2 ordered step(s); step 9 does not exist."* |

Each prior reason wins, and the step-compilation refusal appears only once every
earlier refusal has passed. Every step refusal is a normal read-only
`GATE_BLOCKED` result, never a throw.

### Read-only guarantee

Snapshotting all **5814** `.kanmer` tree entries (sha256 per file) plus
`data/activity.jsonl` before and after a ready `step: 1` packet, a `step: 99`
refusal and a `step: "next"` call: `BOARD_TREE_IDENTICAL=true`,
`ACTIVITY_LOG_IDENTICAL=true`. Step mode persists nothing on either path.

## Verifier notes

- Independent fresh verification run; the verifier did not implement or review
  this ticket.
- `.worktrees/kanmer` (board), `.worktrees/core-118` (implementation) and
  `.worktrees/core-128` (concurrent lane) were not touched. The pre-change
  baseline was produced with `git archive`, not `git worktree add`, so no extra
  worktree was registered.
- The verification worktree was re-asserted detached, clean and at
  `0f4a21fefc3788a4b8c19c7c550e52e0ab8d5ab2` after all checks completed.

## Closeout

- Merged PR: https://github.com/collisionengineers/kanmer/pull/297
- Merge commit: `0f4a21fefc3788a4b8c19c7c550e52e0ab8d5ab2`
- Merge date: 2026-08-28T00:01:09Z
