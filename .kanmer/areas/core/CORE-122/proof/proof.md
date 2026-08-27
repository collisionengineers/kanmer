---
kind: proof-record
merged_sha: "a8318ea631038dfd82e0dc7bbc1f4656f79361f9"
environment: "Detached worktree .worktrees/verify-core-122-a8318ea631038dfd82e0dc7bbc1f4656f79361f9 (HEAD a8318ea631038dfd82e0dc7bbc1f4656f79361f9, no branch, clean); Windows 11 Pro 10.0.26200, Node v24.15.0, npm ci; independent verifier (not implementer/reviewer)"
verified_at: "2026-08-27T16:40:00Z"
result: PASS
attempts:
  - attempted_at: "2026-08-27T16:13:30Z"
    command: "gh pr view 289 --json state,mergeCommit,url"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "state MERGED, mergeCommit.oid a8318ea631038dfd82e0dc7bbc1f4656f79361f9, https://github.com/collisionengineers/kanmer/pull/289"
  - attempted_at: "2026-08-27T16:14:00Z"
    command: "git fetch origin && git worktree add --detach .worktrees/verify-core-122-a8318ea631038dfd82e0dc7bbc1f4656f79361f9 a8318ea631038dfd82e0dc7bbc1f4656f79361f9; git -C <wt> rev-parse HEAD; git -C <wt> symbolic-ref --short -q HEAD; git -C <wt> status --short --branch; npm ci"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "rev-parse HEAD = a8318ea631038dfd82e0dc7bbc1f4656f79361f9; symbolic-ref exit 1 (detached); status '## HEAD (no branch)' clean; npm ci exit 0"
  - attempted_at: "2026-08-27T16:15:24Z"
    command: "npm run build"
    cwd: ".worktrees/verify-core-122-a8318ea631038dfd82e0dc7bbc1f4656f79361f9"
    exit_code: 0
    result: PASS
    summary: "Build success (tsup CJS standalone bundles emitted)"
  - attempted_at: "2026-08-27T16:15:40Z"
    command: "npm test -w @kanmer/core -- reconciliation"
    cwd: ".worktrees/verify-core-122-a8318ea631038dfd82e0dc7bbc1f4656f79361f9"
    exit_code: 0
    result: PASS
    summary: "vitest: 1 test file, Tests 30 passed (30)"
  - attempted_at: "2026-08-27T16:15:50Z"
    command: "node --test packages/mcp-server/src/reconciliation.test.mjs"
    cwd: ".worktrees/verify-core-122-a8318ea631038dfd82e0dc7bbc1f4656f79361f9"
    exit_code: 0
    result: PASS
    summary: "tests 8, pass 8, fail 0"
  - attempted_at: "2026-08-27T16:16:00Z"
    command: "node packages/mcp-server/src/smoke.mjs"
    cwd: ".worktrees/verify-core-122-a8318ea631038dfd82e0dc7bbc1f4656f79361f9"
    exit_code: 0
    result: PASS
    summary: "257/257 checks passed"
  - attempted_at: "2026-08-27T16:16:20Z"
    command: "npm run plugin:check"
    cwd: ".worktrees/verify-core-122-a8318ea631038dfd82e0dc7bbc1f4656f79361f9"
    exit_code: 0
    result: PASS
    summary: "plugin-sync OK: 38 tools match, bundle bytes match, 12 skill frontmatters parse, manifests v0.3.12, isolated MCP handshake lists 38 tools"
  - attempted_at: "2026-08-27T16:15:20Z"
    command: "npm run verify (run 1, backgrounded, log /tmp/verify-core122.log)"
    cwd: ".worktrees/verify-core-122-a8318ea631038dfd82e0dc7bbc1f4656f79361f9"
    exit_code: 1
    result: FAIL
    summary: "core 377/377 passed; gui 486/486 passed; mcp-server test:http 114/115 with 1 fail: http.test.mjs 'project resolution fails before binding and leaves no listener' spawnSync node.exe ETIMEDOUT (known host quirk under load; CORE-122 does not touch packages/mcp-server/src/http.ts or http.test.mjs per git diff --stat dc514375..a8318ea6). test:scripts did not run because the chain stopped."
  - attempted_at: "2026-08-27T16:34:06Z"
    command: "node --test packages/mcp-server/src/http.test.mjs (isolated rerun)"
    cwd: ".worktrees/verify-core-122-a8318ea631038dfd82e0dc7bbc1f4656f79361f9"
    exit_code: 0
    result: PASS
    summary: "tests 5, pass 5, fail 0 — the ETIMEDOUT was load-induced, not a regression"
  - attempted_at: "2026-08-27T16:34:30Z"
    command: "npm run test:scripts"
    cwd: ".worktrees/verify-core-122-a8318ea631038dfd82e0dc7bbc1f4656f79361f9"
    exit_code: 1
    result: FAIL
    summary: "tests 120, pass 118, fail 2: antigravity-plugin-config.test.mjs 'quote-free launcher still reaches the shim when LOCALAPPDATA contains spaces' and 'shipped installer shim restores the provider cwd before MCP launch' — both cmd.exe kanmer-mcp.cmd --probe shim failures (known host quirk; CORE-122 touches nothing under scripts/ — git diff --stat dc514375..a8318ea6 -- scripts is empty)"
  - attempted_at: "2026-08-27T16:24:00Z"
    command: "npm run verify (run 2, foreground 600000 ms timeout, log /tmp/verify-core122-fg.log)"
    cwd: ".worktrees/verify-core-122-a8318ea631038dfd82e0dc7bbc1f4656f79361f9"
    exit_code: 1
    result: FAIL
    summary: "core 377/377 passed; gui 485/486 with 1 fail: apps/gui/src/main/kanmerGit.test.ts 'serializes concurrent orphan cleanup and leaves no quarantine residue' (kanmerGit.test.ts took 282 s under load; known host quirk; CORE-122 touches nothing under apps/gui/src/main — git diff --stat dc514375..a8318ea6 -- apps/gui/src/main is empty; the only apps/gui change is chapters.generated.ts, 1 line)"
  - attempted_at: "2026-08-27T16:17:00Z"
    command: "gh run list --commit a8318ea631038dfd82e0dc7bbc1f4656f79361f9; gh run view 33084574539 --json headSha,conclusion,jobs; git rev-parse '7f841427^{tree}' 'a8318ea6^{tree}'"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "No hosted run on the merge commit itself. PR-head run 33084574539 at 7f8414276ca86f582d8a41d55c4d2d0ac94b6d20: conclusion success, jobs verify=success, kanmer-gate=success. Trees identical: both 9b25995635f3774d31d0697c3737bb81e014ba12, so hosted verify covered exactly the merged content. Hosted CI is authoritative for the three host-quirk rails above."
  - attempted_at: "2026-08-27T16:22:00Z"
    command: "manual acceptance (a): node script on mkdtemp copy of .worktrees/kanmer/.kanmer using packages/core/dist + packages/mcp-server/dist/reconciliation.js reconcileTicket on a seeded Review ticket with prs ['289']"
    cwd: ".worktrees/verify-core-122-a8318ea631038dfd82e0dc7bbc1f4656f79361f9"
    exit_code: 0
    result: PASS
    summary: "findings ['MERGED_REVIEW']; recommendation {action MOVE_TO_VERIFYING, targetStatus verifying, advisory true}; pullRequest evidence {state merged, requiredChecks pass, headSha 7f841427..., mergeSha a8318ea6...} collected via real read-only gh"
  - attempted_at: "2026-08-27T16:22:00Z"
    command: "manual acceptance (b): same script, seeded implementing ticket with taken_at 2026-08-27T00:00Z, claim_expires_at 2026-08-27T01:00Z (past), assignee/branch/worktree set"
    cwd: ".worktrees/verify-core-122-a8318ea631038dfd82e0dc7bbc1f4656f79361f9"
    exit_code: 0
    result: PASS
    summary: "evidence.claim.state = expired; recommendation null (no route claimed)"
  - attempted_at: "2026-08-27T16:22:00Z"
    command: "manual acceptance (c): sha256 over every file in the copied .kanmer before and after both reconcileTicket calls"
    cwd: ".worktrees/verify-core-122-a8318ea631038dfd82e0dc7bbc1f4656f79361f9"
    exit_code: 0
    result: PASS
    summary: "store identical: true (digest 85c58d668333...) — dry-run never mutated the store; live board untouched (temp copy only)"
---

# Proof — CORE-122 read-only reconciliation inspector

Verified independently at the exact PR #289 merge commit `a8318ea631038dfd82e0dc7bbc1f4656f79361f9` in a disposable detached worktree.

## Result: PASS

- Every named deterministic check for this ticket passed at the merge SHA: build, core reconciliation matrix (30), MCP reconciliation collector tests (8), smoke 257/257, plugin:check 38 tools.
- Manual acceptance on a temp copy of the board: merged-Review ticket yields `MOVE_TO_VERIFYING` (advisory) with `MERGED_REVIEW`; a past `claim_expires_at` yields claim state `expired`; the store is byte-identical before/after (read-only guarantee holds).
- Two full `npm run verify` runs and `npm run test:scripts` each failed (exit 1) only on the pre-declared host quirks: `http.test.mjs` spawnSync ETIMEDOUT (passes 5/5 in isolation), `kanmerGit.test.ts` orphan-cleanup under load, and `antigravity-plugin-config.test.mjs` cmd.exe shim (2). CORE-122 modifies none of those files (`git diff --stat dc514375..a8318ea6 -- apps/gui/src/main scripts packages/mcp-server/src/http.test.mjs` is empty). Hosted CI run 33084574539 (verify + kanmer-gate, both success) ran on tree `9b25995635f3...`, identical to the merge commit's tree, and is authoritative for those rails. Failed attempts are retained above.

## Closeout

- PR: https://github.com/collisionengineers/kanmer/pull/289
- Merged: 2026-08-27T16:10:40Z (squash merge `a8318ea631038dfd82e0dc7bbc1f4656f79361f9`)
- Closed out 2026-08-27 by claude-code: worktrees `.worktrees/core-122` and `.worktrees/verify-core-122-a8318ea631038dfd82e0dc7bbc1f4656f79361f9` removed, branch `core-122-reconcile-inspector` deleted locally and on origin.
