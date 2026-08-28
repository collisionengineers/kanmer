---
kind: proof-record
merged_sha: "add0da7fc17968796f43b3035065de400a4db2d4"
environment: >-
  Detached worktree .worktrees/verify-core-128-add0da7fc17968796f43b3035065de400a4db2d4
  at exact PR #305 merge commit add0da7fc17968796f43b3035065de400a4db2d4;
  Microsoft Windows NT 10.0.26200.0, Node v24.15.0, npm 11.14.1; clean npm ci install;
  independent hosted main-push run 33166963130.
verified_at: "2026-08-28T11:45:18.5951103Z"
result: PASS
attempts:
  - attempted_at: "2026-08-28T07:23:00Z"
    command: >-
      npm ci
    cwd: ".worktrees/verify-core-128-d523a29365a20133fc5f0e16a29df40b1a80bd8e"
    exit_code: 0
    result: PASS
    summary: >-
      Workspace dependencies installed cleanly in the detached verification worktree.
  - attempted_at: "2026-08-28T07:25:21Z"
    command: >-
      npm run verify
    cwd: ".worktrees/verify-core-128-d523a29365a20133fc5f0e16a29df40b1a80bd8e"
    exit_code: 1
    result: FAIL
    summary: >-
      The authoritative rail died at step 2 of 12 (npm test) after 9m00s. Fifteen failures in
      scripts/verify-skill-prose.test.mjs, every one ReferenceError: rmSync is not defined.
      Deterministic, not load-sensitive.
  - attempted_at: "2026-08-28T07:28:00Z"
    command: >-
      git diff -U0 d523a293^1 d523a293 | grep '^-[^-]' | grep -E
      'expect\(|assert\.|assert\(|\.toBe|\.toEqual|\.toThrow|\.rejects|\.resolves'
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: >-
      Assertion-integrity sweep of the removed side of all 52 changed files returned exactly one
      line, whose added counterpart differed only in the hang-guard constant 1_000 to 30_000
      inside a Promise.race. Matcher unchanged.
  - attempted_at: "2026-08-28T07:30:00Z"
    command: >-
      gh run view 33151189671 --job 98783311973 --log-failed
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: FAIL
    summary: >-
      Hosted CI at exact merge SHA d523a29365a20133fc5f0e16a29df40b1a80bd8e:
      workflow Pull request verification conclusion=failure. The verify job failed identically;
      scripts tests 136, pass 121, fail 15, skipped 0. Independent confirmation on a second host.
  - attempted_at: "2026-08-28T07:34:30Z"
    command: >-
      npm run test:scripts
    cwd: ".worktrees/verify-core-128-d523a29365a20133fc5f0e16a29df40b1a80bd8e"
    exit_code: 1
    result: FAIL
    summary: >-
      Isolated reproduction: exactly 15 ReferenceError: rmSync is not defined failures, one per
      surviving bare rmSync call in scripts/verify-skill-prose.test.mjs.
  - attempted_at: "2026-08-28T07:35:05Z"
    command: >-
      npm run test -w @kanmer/core
    cwd: ".worktrees/verify-core-128-d523a29365a20133fc5f0e16a29df40b1a80bd8e"
    exit_code: 0
    result: PASS
    summary: >-
      Twenty-three test files, 562/562 passed in 119.73s. Includes the unchanged stale-lock cases
      in io.test.ts that gate lock recovery on owner liveness and identity.
  - attempted_at: "2026-08-28T07:37:07Z"
    command: >-
      npm run test -w @kanmer/gui
    cwd: ".worktrees/verify-core-128-d523a29365a20133fc5f0e16a29df40b1a80bd8e"
    exit_code: 0
    result: PASS
    summary: >-
      Fifty-four test files, 524/524 passed in 401.27s. No unhandled EPERM watch rejection;
      index.sync.test.ts closeProject cleanup was genuinely fixed.
  - attempted_at: "2026-08-28T07:43:50Z"
    command: >-
      npm run test:http -w @kanmer/mcp-server
    cwd: ".worktrees/verify-core-128-d523a29365a20133fc5f0e16a29df40b1a80bd8e"
    exit_code: 0
    result: PASS
    summary: >-
      MCP-server HTTP suite exited 0 in 45s.
  - attempted_at: "2026-08-28T07:44:40Z"
    command: >-
      node --test scripts/antigravity-plugin-config.test.mjs
    cwd: ".worktrees/verify-core-128-d523a29365a20133fc5f0e16a29df40b1a80bd8e"
    exit_code: 0
    result: PASS
    summary: >-
      Four pass, zero fail, skipped 0 under an agent harness. Both cmd.exe tests genuinely ran
      (79.9ms and 66.5ms); the reason-carrying conditional skip did not fire.
  - attempted_at: "2026-08-28T07:45:10Z"
    command: >-
      npm run typecheck; npm run verify:docs; npm run verify:skills;
      npm run verify:agents-block; npm run plugin:check; npm run mcpb:check
    cwd: ".worktrees/verify-core-128-d523a29365a20133fc5f0e16a29df40b1a80bd8e"
    exit_code: 0
    result: PASS
    summary: >-
      All six remaining rail steps passed individually, isolating the old rail failure to
      scripts/verify-skill-prose.test.mjs alone.
  - attempted_at: "2026-08-28T11:26:52Z"
    command: >-
      npm ci
    cwd: ".worktrees/verify-core-128-add0da7fc17968796f43b3035065de400a4db2d4"
    exit_code: 0
    result: PASS
    summary: >-
      Clean dependency install completed in 22.25s: 647 packages added and 652 audited.
  - attempted_at: "2026-08-28T11:27:26.5435090Z"
    command: >-
      node --test scripts/verify-skill-prose.test.mjs
    cwd: ".worktrees/verify-core-128-add0da7fc17968796f43b3035065de400a4db2d4"
    exit_code: 1
    result: FAIL
    summary: >-
      The clean checkout had no generated packages/core/dist/index.js, so Node exited with
      ERR_MODULE_NOT_FOUND before loading any test. This was a missing build prerequisite, not a
      test result or source regression; the environment was changed by the next build before retry.
  - attempted_at: "2026-08-28T11:27:39.0376882Z"
    command: >-
      npm run build
    cwd: ".worktrees/verify-core-128-add0da7fc17968796f43b3035065de400a4db2d4"
    exit_code: 0
    result: PASS
    summary: >-
      Core ESM/types and MCP-server ESM/standalone bundles built successfully, satisfying the
      focused script's generated-dist prerequisite.
  - attempted_at: "2026-08-28T11:28:08.3343462Z"
    command: >-
      node --test scripts/verify-skill-prose.test.mjs
    cwd: ".worktrees/verify-core-128-add0da7fc17968796f43b3035065de400a4db2d4"
    exit_code: 0
    result: PASS
    summary: >-
      Focused regression check passed: tests 28, pass 28, fail 0, skipped 0, duration 26.315s.
      All 15 formerly unbound teardown calls now execute through removeTreeWithRetrySync.
  - attempted_at: "2026-08-28T11:28:40.4549390Z"
    command: >-
      npm run test:scripts
    cwd: ".worktrees/verify-core-128-add0da7fc17968796f43b3035065de400a4db2d4"
    exit_code: 0
    result: PASS
    summary: >-
      Complete scripts suite passed: tests 136, suites 11, pass 136, fail 0, skipped 0,
      duration 28.286s.
  - attempted_at: "2026-08-28T11:29:23.8661609Z"
    command: >-
      npm run verify:skills
    cwd: ".worktrees/verify-core-128-add0da7fc17968796f43b3035065de400a4db2d4"
    exit_code: 0
    result: PASS
    summary: >-
      All canonical skill prose and controller-contract checks passed.
  - attempted_at: "2026-08-28T11:29:38.0505687Z"
    command: >-
      npm run verify
    cwd: ".worktrees/verify-core-128-add0da7fc17968796f43b3035065de400a4db2d4"
    exit_code: 0
    result: PASS
    summary: >-
      The sole complete local Windows rail at the exact merge SHA passed end to end, finishing
      2026-08-28T11:44:38.5770333Z. Core 562/562, GUI 524/524, MCP server 144/144,
      scripts 136/136, MCP smoke 338/338, protocol 50/50, discovery 13/13, agents block 31/31;
      typecheck, docs, headless, MCPB, skill checks, and plugin bundle byte sync all passed.
  - attempted_at: "2026-08-28T11:44:50Z"
    command: >-
      gh run view 33166963130 --repo collisionengineers/kanmer
      --json status,conclusion,headSha,event,createdAt,updatedAt,url,jobs
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: >-
      Hosted main-push workflow completed success at exact head
      add0da7fc17968796f43b3035065de400a4db2d4. Verify job 98834566641 and its authoritative
      rail step both succeeded; the rail ran 2026-08-28T11:23:38Z to 11:29:14Z.
  - attempted_at: "2026-08-28T11:45:18.5951103Z"
    command: >-
      git -C .worktrees/verify-core-128-add0da7fc17968796f43b3035065de400a4db2d4
      rev-parse HEAD; symbolic-ref --short -q HEAD; status --short --branch
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: >-
      Post-rail assertion: HEAD equals add0da7fc17968796f43b3035065de400a4db2d4,
      symbolic-ref is empty as required for detached HEAD, and status is clean with only
      '## HEAD (no branch)'. The path remains distinct from the board and implementation worktrees.
---

# Proof — CORE-128

Verified independently at the exact GitHub merge identity. I did not author, review, or merge
the remediation.

## Result

PASS at add0da7fc17968796f43b3035065de400a4db2d4.

GitHub reports PR #305 MERGED with that exact mergeCommit. The deterministic verification
worktree was created from the full SHA, remained detached and clean before and after the rail,
and was never the board worktree or the retained implementation worktree.

## Exact-SHA evidence

- The focused regression passes 28/28 with no skips.
- The full scripts suite passes 136/136 with no skips.
- The canonical skill checks pass.
- Exactly one complete local npm run verify rail ran on this host and passed every step.
- The independent hosted push-to-main verify rail also passed at the same merge SHA.
- No assertion was weakened or removed by PR #305: its one-file current-main diff is the
  mechanical conversion of 15 remaining bare rmSync teardown calls to
  removeTreeWithRetrySync.

The first focused invocation in the clean checkout is deliberately retained as FAIL: it exited
before test loading because generated core dist did not yet exist. A successful build changed
that environment, after which the same command passed. It was not rerun unchanged.

## Historical failure retained

The earlier exact-merge proof at d523a29365a20133fc5f0e16a29df40b1a80bd8e remains fully
represented in the chronological attempt ledger. Its local and hosted rails failed with the same
15 ReferenceError results because the file had 15 rmSync calls after the import was removed.
PR #305 corrected every surviving call without changing any assertion. F-005 and F-007 from the
old proof are therefore resolved by source change plus independent local and hosted execution,
not by reclassification or an unchanged rerun.

The original ten-run acceptance streak remains in the ticket's checklist and pre-merge report.
This post-merge remediation followed the release controller's bounded rule: one clean exact-SHA
local rail plus one independent hosted rail for a deterministic missing-binding repair.

## Residual risk

No new source risk was found in the remediation. The old proof's already dispositioned minor
notes remain historical residuals outside this one-file repair: the conditional Antigravity skip
is signature-limited and did not fire; one retry-budget comment understates Node's cumulative
delay; one test-only timer can add cost; duplicate AGENTS numbering is cosmetic; and the
contended GUI-open latency path was not directly exercised. None invalidates the named acceptance
evidence or the exact-SHA PASS.

## Merge record

- PR: https://github.com/collisionengineers/kanmer/pull/305
- Reviewed head: `662938dbef8bf65ad9762a30bba4b396ca249634`
- Merge SHA: `add0da7fc17968796f43b3035065de400a4db2d4`
- Merged at: `2026-08-28T11:23:20Z`
