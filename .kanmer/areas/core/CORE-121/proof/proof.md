---
kind: proof-record
merged_sha: "dc5143754506e915989e1923616267a8d664425d"
environment: ".worktrees/verify-core-121-dc5143754506e915989e1923616267a8d664425d (detached, clean, HEAD dc5143754506e915989e1923616267a8d664425d); Windows 11 Pro 10.0.26200, Git Bash, Node v24.15.0, npm ci; verifier actor claude-code (independent run, not author or reviewer)"
verified_at: "2026-08-27T12:43:00Z"
result: INCONCLUSIVE
attempts:
  - attempted_at: "2026-08-27T11:55:00Z"
    command: "gh pr view 287 --json state,mergeCommit,url"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "state MERGED, mergeCommit.oid dc5143754506e915989e1923616267a8d664425d, url https://github.com/collisionengineers/kanmer/pull/287"
  - attempted_at: "2026-08-27T11:55:20Z"
    command: "git worktree add --detach .worktrees/verify-core-121-dc5143754506e915989e1923616267a8d664425d dc5143754506e915989e1923616267a8d664425d && git -C <wt> rev-parse HEAD && git -C <wt> symbolic-ref --short -q HEAD; git -C <wt> status --short --branch"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "rev-parse HEAD = dc5143754506e915989e1923616267a8d664425d; symbolic-ref empty (exit 1, detached); status '## HEAD (no branch)' with no entries (clean)"
  - attempted_at: "2026-08-27T11:55:39Z"
    command: "npm ci && npm run build"
    cwd: ".worktrees/verify-core-121-dc5143754506e915989e1923616267a8d664425d"
    exit_code: 0
    result: PASS
    summary: "dependencies installed; workspace build succeeded (core, mcp-server incl. standalone CJS bundles)"
  - attempted_at: "2026-08-27T11:59:07Z"
    command: "npm test -w @kanmer/core -- claims"
    cwd: ".worktrees/verify-core-121-dc5143754506e915989e1923616267a8d664425d"
    exit_code: 0
    result: PASS
    summary: "Test Files 1 passed, Tests 24 passed (24) — claims.test.ts"
  - attempted_at: "2026-08-27T11:59:25Z"
    command: "node packages/mcp-server/src/smoke.mjs"
    cwd: ".worktrees/verify-core-121-dc5143754506e915989e1923616267a8d664425d"
    exit_code: 0
    result: PASS
    summary: "252/252 checks passed"
  - attempted_at: "2026-08-27T12:00:34Z"
    command: "npm run plugin:check"
    cwd: ".worktrees/verify-core-121-dc5143754506e915989e1923616267a8d664425d"
    exit_code: 0
    result: PASS
    summary: "plugin-sync OK — 37 tools match, bundle bytes match, 12 skill frontmatters parse, manifests at v0.3.12, isolated MCP handshake lists 37 tools"
  - attempted_at: "2026-08-27T12:00:48Z"
    command: "npm run verify"
    cwd: ".worktrees/verify-core-121-dc5143754506e915989e1923616267a8d664425d"
    exit_code: 1
    result: FAIL
    summary: "core rail passed; mcp-server rail 106 pass / 1 fail: http.test.mjs 'project resolution fails before binding and leaves no listener' — AssertionError: spawnSync node.exe ETIMEDOUT (child node spawn timed out; ran concurrently with the manual acceptance script). gui and scripts rails not reached."
  - attempted_at: "2026-08-27T12:12:35Z"
    command: "node /tmp/accept-core121.mjs <verify-wt>/packages/core/dist/index.js <tempBoardRoot> (manual acceptance against a mkdtemp COPY of .worktrees/kanmer/.kanmer; live board untouched)"
    cwd: "."
    exit_code: 1
    result: FAIL
    summary: "Harness error, not a product failure: first script draft used a static import of process.argv (SyntaxError); second draft hit the fix-profile enter-review doc gate (post-implementation-report) when moving the throwaway ticket forward for the second-return check. Steps 1-5 already observed passing on that run."
  - attempted_at: "2026-08-27T12:15:20Z"
    command: "node /tmp/accept-core121.mjs <verify-wt>/packages/core/dist/index.js /tmp/kanmer-verify-core121-WSoS (fresh copy of the board; KanmerStore(tempRoot, { actor: 'verifier-a' }))"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "1) createItem(implementing) + takeTicket(assignee ctl-a, branch b1, worktree .worktrees/b1): claim_expires_at set (2026-08-27T12:45:22.965Z). 2) transferTicket as actor ctl-b on live claim: error 'CLAIM_LIVE: \"TICK-003\" is held by ctl-a until ...'. 3) rewrote claim_expires_at to 2000-01-01 in the ticket file; transferTicket succeeds: assignee=ctl-b, branch=b1 and worktree=.worktrees/b1 preserved, new claim_expires_at issued. 4) createItem(review, prs ['1']); moveItem→implementing with reason, no attestation: 'REVIEW_RETURN_NEEDS_ATTESTATION: ... no scratch/review.md attestation exists'. 5) setDoc scratch/review with valid needs-changes attestation for pr '1'; moveItem→implementing succeeds, status=implementing review_round=1. 6) moved back to review; second return with reason: 'REMEDIATION_BUDGET_EXHAUSTED: ... returned to implementing 1 time(s) against a budget of 1'. Script exit 0."
  - attempted_at: "2026-08-27T12:16:42Z"
    command: "npm run verify (retry, nothing else running)"
    cwd: ".worktrees/verify-core-121-dc5143754506e915989e1923616267a8d664425d"
    exit_code: 1
    result: FAIL
    summary: "core rail 16 files / 347 tests passed; mcp-server rail passed this time; gui rail: 2 files failed, 5 tests failed / 481 passed (486), duration 813s — kanmerGit.test.ts x4 and index.sync.test.ts x1, all 'Error: Hook timed out in 10000ms' (git-backed beforeEach fixtures) plus one downstream assertion in 'serializes concurrent orphan cleanup'. scripts rail not reached. The merge commit touches no packages/gui or scripts/ files."
  - attempted_at: "2026-08-27T12:34:09Z"
    command: "npm test -w @kanmer/gui -- src/main/kanmerGit.test.ts src/main/index.sync.test.ts (diagnostic rerun of the failing files in isolation)"
    cwd: ".worktrees/verify-core-121-dc5143754506e915989e1923616267a8d664425d"
    exit_code: 1
    result: FAIL
    summary: "57 passed, 2 failed — a DIFFERENT pair of kanmerGit.test.ts cases (renameBoardBranch history/remote; unexpected-branch handoff), again 'Hook timed out in 10000ms'. Failure set is non-deterministic across runs, consistent with slow git fixture setup on this Windows host rather than a code defect."
  - attempted_at: "2026-08-27T12:42:59Z"
    command: "gh run list --commit dc5143754506e915989e1923616267a8d664425d --json databaseId,name,conclusion,status; gh run view 33065438808 --json headSha,conclusion,status,jobs; git rev-parse a79f125c^{tree} dc514375^{tree}"
    cwd: "."
    exit_code: 0
    result: INCONCLUSIVE
    summary: "No workflow run exists for the merge commit dc5143754506e915989e1923616267a8d664425d (push to main triggered none). PR-head run 33065438808 'Pull request verification' at headSha a79f125c95cad5e1d93ac393a84bb89a7ac5ccc3: conclusion success, jobs verify=success, kanmer-gate=success. Both commits resolve to the identical tree cc05eedcfc465958d22cec468e5511a9503a5d58 (squash merge), so the hosted green covers the exact shipped content but is bound to the PR head SHA, not the merge SHA. Recorded as hosted evidence, not as a PASS of the merge-SHA check."
---

# Proof — CORE-121

Independent verification of PR #287 (merge commit `dc5143754506e915989e1923616267a8d664425d`) in a detached worktree at that exact SHA.

## Result: INCONCLUSIVE (retryable; ticket stays in Verifying)

What passed on the merge SHA:

- Packet-named checks: `npm test -w @kanmer/core -- claims` (24/24), `node packages/mcp-server/src/smoke.mjs` (252/252), `npm run plugin:check` (OK).
- Manual acceptance of all four ticket Verification bullets' core behaviour, run against the built core library on a throwaway copy of the board: CLAIM_LIVE refusal, expired-claim transfer preserving branch/worktree, REVIEW_RETURN_NEEDS_ATTESTATION, attested return with `review_round` 1, REMEDIATION_BUDGET_EXHAUSTED on the second return.

What did not pass locally:

- `npm run verify` failed twice (exit 1). Attempt 1: one mcp-server `http.test.mjs` case with `spawnSync node.exe ETIMEDOUT`. Attempt 2: five GUI tests in `kanmerGit.test.ts` / `index.sync.test.ts` with `Hook timed out in 10000ms`. An isolated rerun failed a different pair of the same file's cases with the same hook timeout. The failing set is non-deterministic and confined to git-fixture setup on this Windows host; the merge touches no `packages/gui` or `scripts/` files. The anticipated `scripts/antigravity-plugin-config.test.mjs` EBUSY failure was never reached because verify stops at the first failing rail.

Why INCONCLUSIVE rather than PASS: the skill requires a truthful top-level PASS and says a required check that failed leaves the ticket in Verifying. `npm run verify` is the repo-wide gate and it did not pass on this host at the merge SHA. Hosted CI (run 33065438808) is green for verify and kanmer-gate, and its head `a79f125c` has the identical tree as the merge commit, but that evidence is bound to the PR head SHA and no workflow ran on the merge SHA itself, so it does not substitute for a merge-SHA-bound green run.

Why INCONCLUSIVE rather than FAIL: every observed failure is a timeout in fixture setup unrelated to the change, with a shifting failure set; the shipped content passed the same gate in CI. My judgement is that this is environmental, but that judgement is not itself evidence.

## Suggested next step

Retry `npm run verify` on a faster host or in hosted CI on `dc5143754506e915989e1923616267a8d664425d` (for example a manual `workflow_dispatch`), then append the attempt and re-issue this record. Alternatively an operator may record `WAIVED_BY_OPERATOR` with identity and reason. The detached verification worktree `.worktrees/verify-core-121-dc5143754506e915989e1923616267a8d664425d` has been left in place for that rerun.
