---
kind: proof-record
merged_sha: "bf0eaed49100ba6e25f37de2df883ebaf25c2dc5"
environment: "Detached verification worktree .worktrees/verify-core-117-bf0eaed49100ba6e25f37de2df883ebaf25c2dc5 at bf0eaed4 (clean, detached); Windows 11 Pro 10.0.26200, Node v24.15.0, npm ci from the merge-SHA lockfile; manual acceptance driven against mkdtemp copies of .worktrees/kanmer/.kanmer through the built dist server and the installed v0.3.12 standalone server"
verified_at: "2026-08-28T05:05:00Z"
result: PASS
attempts:
  - attempted_at: "2026-08-28T03:00:00Z"
    command: "gh pr view 298 --json state,mergeCommit,url"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: "state MERGED, mergeCommit.oid bf0eaed49100ba6e25f37de2df883ebaf25c2dc5, url .../pull/298. Everything below is bound to that SHA."
  - attempted_at: "2026-08-28T03:01:00Z"
    command: "git fetch origin"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: "0f4a21fe..bf0eaed4 main -> origin/main."
  - attempted_at: "2026-08-28T03:02:00Z"
    command: "git worktree add --detach .worktrees/verify-core-117-bf0eaed49100ba6e25f37de2df883ebaf25c2dc5 bf0eaed49100ba6e25f37de2df883ebaf25c2dc5"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: "Created detached at bf0eaed4. Not .worktrees/kanmer and not the implementation worktree .worktrees/core-117; no other lane's worktree was touched."
  - attempted_at: "2026-08-28T03:03:00Z"
    command: "git -C <verify worktree> rev-parse HEAD; symbolic-ref --short -q HEAD; status --short --branch"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: "HEAD bf0eaed49100ba6e25f37de2df883ebaf25c2dc5 (exact match); symbolic-ref empty (detached, exit 1 as expected); status '## HEAD (no branch)' — clean."
  - attempted_at: "2026-08-28T03:05:00Z"
    command: "npm ci"
    cwd: "<verify worktree>"
    exit_code: 0
    result: PASS
    summary: "647 packages installed from the merge-SHA lockfile."
  - attempted_at: "2026-08-28T03:07:00Z"
    command: "npm run build"
    cwd: "<verify worktree>"
    exit_code: 0
    result: PASS
    summary: "core + mcp-server ESM/CJS and standalone bundles built successfully."
  - attempted_at: "2026-08-28T03:09:00Z"
    command: "npm run typecheck"
    cwd: "<verify worktree>"
    exit_code: 0
    result: PASS
    summary: "core, mcp-server, ui and gui (node + web projects) all typecheck clean."
  - attempted_at: "2026-08-28T03:57:00Z"
    command: "npm test -w @kanmer/core"
    cwd: "<verify worktree>"
    exit_code: 1
    result: FAIL
    summary: "493/501 passed; 8 failed — 7 in src/claims.test.ts (CORE-115/CORE-124) and 1 in src/docs.test.ts. Every failure was ENOTEMPTY rmdir on a %TEMP% fixture or 'Test timed out in 5000ms'; no assertion about capture behaviour failed. `git diff --name-only bf0eaed4^1 bf0eaed4` confirms CORE-117 modified neither file. Retained; isolated below."
  - attempted_at: "2026-08-28T04:03:00Z"
    command: "npx vitest run --no-file-parallelism src/claims.test.ts src/docs.test.ts"
    cwd: "<verify worktree>/packages/core"
    exit_code: 1
    result: FAIL
    summary: "96/98 passed; 2 failed, a different subset than the previous run, all 5000ms timeouts. Failure set is not stable across runs."
  - attempted_at: "2026-08-28T04:05:00Z"
    command: "npx vitest run --no-file-parallelism src/claims.test.ts"
    cwd: "<verify worktree>/packages/core"
    exit_code: 1
    result: FAIL
    summary: "47/48 passed; 1 failed (5000ms timeout). Failure count fell 8 -> 2 -> 1 as concurrent load fell — the CORE-128 host-flake signature, not a defect in the shipped tree."
  - attempted_at: "2026-08-28T04:06:00Z"
    command: "npx vitest run --no-file-parallelism src/capture.test.ts src/board.test.ts src/profile-matrix.test.ts src/gates.test.ts"
    cwd: "<verify worktree>/packages/core"
    exit_code: 0
    result: PASS
    summary: "69/69 passed. Every test CORE-117 added or touched in core passes cleanly, including the new src/capture.test.ts."
  - attempted_at: "2026-08-28T04:06:56Z"
    command: "npm test -w @kanmer/gui"
    cwd: "<verify worktree>"
    exit_code: 0
    result: PASS
    summary: "524/524 passed across 54 files — exactly the expected count. The reviewer's 519/524 and 522/524 observations with differing failing pairs in kanmerGit.test.ts did not reproduce; consistent with the CORE-128 host-flake family."
  - attempted_at: "2026-08-28T04:15:00Z"
    command: "node packages/mcp-server/src/smoke.mjs"
    cwd: "<verify worktree>"
    exit_code: 0
    result: PASS
    summary: "328/328 checks passed — exactly the expected count."
  - attempted_at: "2026-08-28T04:17:00Z"
    command: "npm run smoke:protocol"
    cwd: "<verify worktree>"
    exit_code: 0
    result: PASS
    summary: "50/50 checks passed — exactly the expected count."
  - attempted_at: "2026-08-28T04:18:00Z"
    command: "npm run verify:skills"
    cwd: "<verify worktree>"
    exit_code: 0
    result: PASS
    summary: "ALL CHECKS PASSED; every skill contract present."
  - attempted_at: "2026-08-28T04:19:00Z"
    command: "npm run plugin:check"
    cwd: "<verify worktree>"
    exit_code: 0
    result: PASS
    summary: "plugin-sync OK — 39 tools match (roster stays 39), bundle bytes match, 12 skill frontmatters parse, manifests at v0.3.12, isolated MCP handshake lists 39 tools."
  - attempted_at: "2026-08-28T04:25:00Z"
    command: "npm run verify (foreground)"
    cwd: "<verify worktree>"
    exit_code: 143
    result: INCONCLUSIVE
    summary: "Killed by the 600000 ms harness timeout before completing; no verdict. Superseded by the clean background run below. Its orphaned children briefly contended with the restart, so only the completed run below is treated as evidence."
  - attempted_at: "2026-08-28T04:35:00Z"
    command: "npm run verify (background, to completion)"
    cwd: "<verify worktree>"
    exit_code: 1
    result: FAIL
    summary: "build OK; check:manual OK; @kanmer/core 501/501 passed (22/22 files — the exact expected count, so the earlier standalone core failure was purely flake); @kanmer/gui 524/524 passed (54/54 files); test:http OK. The only failures in the entire rail were 2 tests in scripts/antigravity-plugin-config.test.mjs — 'the quote-free launcher still reaches the shim when LOCALAPPDATA contains spaces' and 'the shipped installer shim restores the provider cwd before MCP launch' — failing with EBUSY rmdir on a locked %TEMP% fixture. This is the documented CORE-128 'antigravity EBUSY x2' quirk. CORE-117 touched no antigravity, installer, shim or scripts/ file."
  - attempted_at: "2026-08-28T04:50:00Z"
    command: "node --test scripts/antigravity-plugin-config.test.mjs"
    cwd: "<verify worktree>"
    exit_code: 1
    result: FAIL
    summary: "Same 2 tests fail in isolation, this time as 'Command failed: cmd.exe ... pushd !LOCALAPPDATA!\\Kanmer\\bin && call kanmer-mcp.cmd'. These are win32-only tests that shell out to cmd.exe against an installed-runtime layout; they are host/installed-runtime dependent, and their error mode changes between runs. Attributed to the host, not the tree — see the hosted evidence below."
  - attempted_at: "2026-08-28T04:52:00Z"
    command: "gh run list --commit bf0eaed49100ba6e25f37de2df883ebaf25c2dc5; gh run view 33137270605"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: "Push-to-main run 33137270605 ('Pull request verification', event push, headSha bf0eaed4) completed SUCCESS in 4m51s. Jobs: verify success, regate success, kanmer-gate skipped (skipped is correct — that job is gated on pull_request). Decisive: the verify job runs on windows-latest and executes `npm ci && npm run verify`, i.e. the identical rail including the two win32-only antigravity tests, and it passed at this exact merge SHA. The local non-zero exits are therefore host-specific, not properties of the shipped tree. https://github.com/collisionengineers/kanmer/actions/runs/33137270605"
  - attempted_at: "2026-08-28T04:53:00Z"
    command: "gh run view 33135597542 --json displayTitle,status,conclusion,headSha,url"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: "PR-head run at cbd05ca5dd925989c5d556aa00b2b60a0e2b0a98 completed SUCCESS. https://github.com/collisionengineers/kanmer/actions/runs/33135597542"
  - attempted_at: "2026-08-28T03:15:00Z"
    command: "Manual acceptance AC1 + AC2 refusals — MCP client against the built dist server on an mkdtemp copy of .worktrees/kanmer/.kanmer"
    cwd: "<verify worktree> (sandbox C:/Users/Alex/AppData/Local/Temp/core117-ac-5RZU2j)"
    exit_code: 0
    result: PASS
    summary: "15/15. AC1: a capture created with only title + observation succeeds; get_doc_gates returns zero boundaries and docs_todo false; the item carries no docs_todo; profile capture, status backlog; search_items finds it. Missing title and missing observation are both refused with CAPTURE_OBSERVATION_REQUIRED at create AND at update (emptying either is refused). Absent optional evidence is valid; capture_evidence is accepted when present. AC2 refusals: move_item off Backlog -> CAPTURE_NOT_PROMOTED; take_ticket -> CAPTURE_NOT_PROMOTED; get_execution_packet -> ready false, GATE_BLOCKED, 'is a quick capture, not planned work'."
  - attempted_at: "2026-08-28T03:18:00Z"
    command: "Manual acceptance AC2 roster + AC3 dispositions + AC4 (first harness)"
    cwd: "<verify worktree> (sandbox C:/Users/Alex/AppData/Local/Temp/core117-ac2-NEeO2M)"
    exit_code: 1
    result: FAIL
    summary: "26/27. The single failure was a defect in my own probe, not in the product: it called create_group with `type` instead of the required `kind`, so the group was never created and the roster assertion had no data. All AC3 and AC4 checks in this run passed. Superseded by the corrected roster probe below; retained for honesty."
  - attempted_at: "2026-08-28T03:19:39Z"
    command: "Manual acceptance AC2 roster exclusion (corrected harness)"
    cwd: "<verify worktree> (sandbox C:/Users/Alex/AppData/Local/Temp/core117-ac3-o4UTzR)"
    exit_code: 0
    result: PASS
    summary: "2/2, and the raw get_group output is unambiguous. With one normal ticket in EPIC-014: members 1, progress.backlog 1, total 1. After adding a capture to the same epic: members 2 (the capture IS listed, tagged profile capture) but progress.backlog stays 1 and total stays 1. Membership is visibility; the capture is excluded from the counted roster/readiness workload exactly as FRD-032 AC2 requires."
  - attempted_at: "2026-08-28T03:18:33Z"
    command: "Manual acceptance AC3 — all six FRD-032 dispositions via update_item"
    cwd: "<verify worktree> (sandbox core117-ac2-NEeO2M)"
    exit_code: 0
    result: PASS
    summary: "All six recorded, each with capture_decided_at and capture_decided_by, applied inside CORE-125's board write lock. Implemented enum ids are duplicate | already-fixed | batch | promoted | retained | not-required — a 1:1 mapping onto the FRD's six prose outcomes (already-fixed = 'fixed', not-required = 'archived'). Observed implied effects: duplicate -> links [CORE-135] then archived true; already-fixed -> archived true; batch -> profile chore, unarchived; promoted -> profile chore, unarchived; retained -> stays profile capture, unarchived; not-required -> archived true. Refusal semantics also confirmed: promoted/batch without a non-capture profile -> CAPTURE_PROMOTION_NEEDS_PROFILE; a settled non-retained disposition cannot be overwritten -> CAPTURE_ALREADY_DISPOSED; only retained may be superseded (verified retained -> not-required succeeds)."
  - attempted_at: "2026-08-28T03:18:39Z"
    command: "Manual acceptance AC4 — gates apply from promotion onward, not retroactively"
    cwd: "<verify worktree> (sandbox core117-ac2-NEeO2M)"
    exit_code: 0
    result: PASS
    summary: "Before promotion the capture has 0 gate boundaries. After update_item {capture_disposition: promoted, profile: feature}, get_doc_gates returns 4 boundaries with unmet leave-backlog:governing-doc, leave-preparing:research/files/plan/checklist, enter-review:post-implementation-report, enter-done:proof. move_item then fails with the ordinary gate message ('leaving Backlog requires governing-doc (profile \"feature\")') and no longer with CAPTURE_NOT_PROMOTED. Forward-only: the ticket is still in backlog, carries profile feature, and retains capture_disposition promoted with its decision timestamp — no back-dated document debt was synthesised."
  - attempted_at: "2026-08-28T03:20:00Z"
    command: "v0.3.12 compatibility — installed stable server (first harness)"
    cwd: "<verify worktree> (sandbox core117-compat-A24L7x)"
    exit_code: 1
    result: FAIL
    summary: "6/7. The single failure was my own probe asserting that list_board would contain a ticket id; list_board returns board structure, not tickets. Product behaviour in this run was correct throughout. Superseded by the corrected probe below; retained for honesty."
  - attempted_at: "2026-08-28T03:21:02Z"
    command: "v0.3.12 compatibility — installed stable server C:/Users/Alex/AppData/Local/Programs/Kanmer/resources/plugins/kanmer/mcp/kanmer-mcp.cjs (corrected harness)"
    cwd: "<verify worktree> (sandbox C:/Users/Alex/AppData/Local/Temp/core117-compat2-xPyrCd)"
    exit_code: 0
    result: PASS
    summary: "9/9. The stable build (plugin v0.3.12 sha 639df4cf) lists the capture via list_items, searches a board containing captures, and edits the capture itself — all without error. Byte comparison of the ticket file before/after the stable rewrite: the file genuinely changed (title edited, updated bumped, key order shifted) while `profile: capture`, `capture_evidence` (both the file path and the URL) and `capture_actor: verifier` all survived intact. The stable server refuses to SET profile capture in both directions: update_item and create_item each return 'Unknown profile \"capture\". Valid: feature, fix, chore, spike, custom'. Additive-optional frontmatter compatibility holds in both directions."
  - attempted_at: "2026-08-28T03:23:00Z"
    command: "Known-open-defect confirmation (dispositioned minor by review; NOT verification failures)"
    cwd: "<verify worktree> (sandbox C:/Users/Alex/AppData/Local/Temp/core117-def-uGpr6O)"
    exit_code: 0
    result: PASS
    summary: "6/6 confirmed exactly as the review described, so the controller's follow-up tickets are accurate. (1) update_item {profile: chore} with no disposition silently promotes a capture — profile becomes chore, capture_disposition stays undefined. (2) A superseding disposition omitting capture_result keeps the previous result — retained/'FIRST-RESULT' then not-required leaves capture_result 'FIRST-RESULT'. (3) duplicate accepts the capture's own id — self-link then archive. (4) dispatch_task does not refuse a capture: a capture and a normal ticket receive the byte-identical DISPATCH_DISABLED refusal, and grep confirms CAPTURE_NOT_PROMOTED is raised only at store.ts:1354 (take_ticket) and store.ts:2195 (assertDocGate), plus the execution-packet refusal — there is no capture check anywhere in the dispatch path. (5) create_item is ungated, so a capture can be born outside Backlog (created directly at status implementing) — it is inert there, since get_execution_packet still refuses it."
---

# Proof — CORE-117 quick capture and deliberate promotion

Verified at the exact GitHub merge SHA `bf0eaed49100ba6e25f37de2df883ebaf25c2dc5`
(PR #298, state `MERGED`) in a disposable detached worktree. The mutable `main`
checkout, the board worktree `.worktrees/kanmer`, the implementation worktree
`.worktrees/core-117` and the concurrent lanes' worktrees were never modified.

## Result: PASS

Every FRD-032 acceptance criterion was exercised by hand against throwaway
copies of the board and each one holds. Every named deterministic check reached
its exact expected count at this SHA: core **501/501**, gui **524/524**, smoke
**328/328**, protocol **50/50**, plugin roster **39 tools**, `verify:skills` all
green, `build` and `typecheck` clean.

### Why two non-zero exits do not make this a failure

Two commands exited non-zero locally and both are retained above in full.

1. **`npm test -w @kanmer/core` (exit 1).** Eight failures, all `ENOTEMPTY`
   rmdir on `%TEMP%` fixtures or 5000 ms timeouts, all in `claims.test.ts` and
   `docs.test.ts` — files the merge commit does not touch. Re-running shrank the
   failure set 8 → 2 → 1 with a *different* subset each time, and the same suite
   later passed **501/501** inside `npm run verify`. Non-deterministic, load
   dependent, and confined to untouched code: the CORE-128 host-flake family.

2. **`npm run verify` (exit 1).** Inside that run core passed 501/501 and gui
   passed 524/524; the *only* failures in the whole rail were the two win32-only
   tests in `scripts/antigravity-plugin-config.test.mjs`, failing with `EBUSY` on
   a locked temp fixture — the documented CORE-128 "antigravity EBUSY ×2" quirk.
   CORE-117 touches no `scripts/`, installer, shim or antigravity file.

The decisive control is hosted. The `verify` job in `.github/workflows/pr.yml`
runs on **windows-latest** and executes `npm ci && npm run verify` — the
identical rail, including those two win32-only antigravity tests — and the
push-to-main run bound to this exact merge SHA
([33137270605](https://github.com/collisionengineers/kanmer/actions/runs/33137270605))
completed **success** (`verify` success, `regate` success, `kanmer-gate` skipped
because it is gated on `pull_request`). The PR-head run
([33135597542](https://github.com/collisionengineers/kanmer/actions/runs/33135597542))
at `cbd05ca5` also succeeded. `npm run verify` therefore passes at this SHA on a
clean Windows machine; the local non-zero exits are properties of this host, not
of the shipped tree.

## Acceptance criteria

**AC1 — capture with no document debt.** A capture created with only a title and
an observation succeeds, reports zero gate boundaries and `docs_todo: false`,
carries no `docs_todo` field, sits in Backlog and is found by `search_items`. A
missing title or missing observation is refused with
`CAPTURE_OBSERVATION_REQUIRED` at **create and at update** — the observation
cannot be emptied after the fact. Absent optional evidence is valid;
`capture_evidence` is accepted when supplied.

**AC2 — excluded from readiness and roster.** Adding a capture to an epic moved
`members` from 1 to 2 while `progress.backlog` and `total` both stayed at 1: the
capture stays visible as a member but is excluded from the counted workload. All
three refusals fire — `move_item` off Backlog and `take_ticket` return
`CAPTURE_NOT_PROMOTED`, and `get_execution_packet` returns `GATE_BLOCKED`.

**AC3 — six dispositions.** All six recorded, each stamped with
`capture_decided_at` and `capture_decided_by`, each producing its implied effect:
`duplicate` links then archives, `already-fixed` archives, `batch` and `promoted`
move the profile off capture, `retained` stays a capture, `not-required`
archives. The implemented enum is `duplicate | already-fixed | batch | promoted
| retained | not-required`, a 1:1 mapping onto the FRD's six prose outcomes.
Promotion without a non-capture profile is refused
(`CAPTURE_PROMOTION_NEEDS_PROFILE`); a settled non-retained disposition cannot be
overwritten (`CAPTURE_ALREADY_DISPOSED`); only `retained` may be superseded.

**AC4 — gates apply from promotion onward.** Zero boundaries before promotion;
after promoting to `feature`, the full four-boundary feature gate set applies and
`move_item` fails with the ordinary governing-doc message rather than the capture
refusal. The ticket stays in Backlog with its decision retained — no retroactive
document debt is synthesised.

**v0.3.12 compatibility.** The installed stable server (plugin v0.3.12, sha
`639df4cf`) reads, searches, lists and edits a board containing captures. A full
rewrite by the stable server preserved `profile: capture`, `capture_evidence`
(file path and URL) and `capture_actor`. It refuses to *set* `profile: capture`
via both `update_item` and `create_item` ("Unknown profile"). Additive-optional
frontmatter compatibility holds in both directions.

## Known open defects — confirmed, not verification failures

The review dispositioned these five as minor and deferred them to follow-up
tickets the controller is filing. All five were re-confirmed here so those
tickets are accurate; none of them contradicts an acceptance criterion.

1. `update_item {profile: "chore"}` with no disposition silently promotes a
   capture (profile changes, `capture_disposition` stays unset).
2. A superseding disposition that omits `capture_result` keeps the previous
   result.
3. `duplicate` accepts the capture's own id, producing a self-link then archive.
4. `dispatch_task` does not refuse a capture — `CAPTURE_NOT_PROMOTED` is raised
   only in `take_ticket` (`store.ts:1354`) and `assertDocGate`
   (`store.ts:2195`), plus the execution-packet refusal; the dispatch path has
   no capture check. Locally both a capture and a normal ticket receive the
   identical `DISPATCH_DISABLED` refusal, so the absence was confirmed
   structurally and in source rather than by reaching a live dispatch.
5. `create_item` is ungated, so a capture can be born outside Backlog. It is
   inert there — `get_execution_packet` still refuses it.
