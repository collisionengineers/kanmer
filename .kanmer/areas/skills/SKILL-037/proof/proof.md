---
kind: proof-record
merged_sha: "3267c7dfd416c63339c42c3ef0c2f0115ba0f973"
environment: "detached worktree .worktrees/verify-skill-037-3267c7dfd416c63339c42c3ef0c2f0115ba0f973 (HEAD 3267c7df, no branch, clean); Windows 11 Pro 10.0.26200, Node v24.15.0, npm ci; hosted GitHub Actions run 33097415203"
verified_at: "2026-08-27T18:05:00Z"
result: PASS
attempts:
  - attempted_at: "2026-08-27T17:20:00Z"
    command: "gh pr view 290 --json state,mergeCommit,url"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "state MERGED, mergeCommit.oid 3267c7dfd416c63339c42c3ef0c2f0115ba0f973, url https://github.com/collisionengineers/kanmer/pull/290"
  - attempted_at: "2026-08-27T17:21:00Z"
    command: "git fetch origin && git worktree add --detach .worktrees/verify-skill-037-3267c7dfd416c63339c42c3ef0c2f0115ba0f973 3267c7dfd416c63339c42c3ef0c2f0115ba0f973; rev-parse HEAD; symbolic-ref --short -q HEAD; status --short --branch"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "HEAD 3267c7dfd416c63339c42c3ef0c2f0115ba0f973; symbolic-ref empty (detached); status '## HEAD (no branch)' clean. Not .worktrees/kanmer nor .worktrees/skill-037."
  - attempted_at: "2026-08-27T17:22:00Z"
    command: "git diff --stat 5684174a..3267c7df"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "8 files changed, 407+/61-: kanmer-auto/closeout/execute/review/verify SKILL.md, kanmer-tickets/references/tool-reference.md, scripts/verify-skill-prose.mjs, scripts/verify-skill-prose.test.mjs. No packages/ or apps/ code changed."
  - attempted_at: "2026-08-27T17:25:00Z"
    command: "npm ci"
    cwd: ".worktrees/verify-skill-037-3267c7dfd416c63339c42c3ef0c2f0115ba0f973"
    exit_code: 0
    result: PASS
    summary: "dependencies installed"
  - attempted_at: "2026-08-27T17:27:00Z"
    command: "npm run verify:skills"
    cwd: ".worktrees/verify-skill-037-3267c7dfd416c63339c42c3ef0c2f0115ba0f973"
    exit_code: 0
    result: PASS
    summary: "ALL CHECKS PASSED (includes new prose contract checks, e.g. 'kanmer-closeout accepts the operator waiver', 'kanmer-auto transfers expired claims, never forces, and routes remediation')"
  - attempted_at: "2026-08-27T17:27:30Z"
    command: "npm run verify:agents-block"
    cwd: ".worktrees/verify-skill-037-3267c7dfd416c63339c42c3ef0c2f0115ba0f973"
    exit_code: 0
    result: PASS
    summary: "31/31 checks passed"
  - attempted_at: "2026-08-27T17:28:00Z"
    command: "node --test scripts/verify-skill-prose.test.mjs"
    cwd: ".worktrees/verify-skill-037-3267c7dfd416c63339c42c3ef0c2f0115ba0f973"
    exit_code: 0
    result: PASS
    summary: "all tests pass, 0 failed, duration 9.8s"
  - attempted_at: "2026-08-27T17:28:30Z"
    command: "npm run verify:docs"
    cwd: ".worktrees/verify-skill-037-3267c7dfd416c63339c42c3ef0c2f0115ba0f973"
    exit_code: 0
    result: PASS
    summary: "verify-docs: PASS — manual up to date (22 chapters)"
  - attempted_at: "2026-08-27T17:29:00Z"
    command: "npm run plugin:check"
    cwd: ".worktrees/verify-skill-037-3267c7dfd416c63339c42c3ef0c2f0115ba0f973"
    exit_code: 1
    result: FAIL
    summary: "refused: @kanmer/core cannot resolve from this checkout (core not yet built before npm run verify). Retried after build below."
  - attempted_at: "2026-08-27T17:45:00Z"
    command: "npm run verify (first run; log written to shared /tmp/verify.log)"
    cwd: ".worktrees/verify-skill-037-3267c7dfd416c63339c42c3ef0c2f0115ba0f973"
    exit_code: 1
    result: INCONCLUSIVE
    summary: "Exit 1, but the captured log's stack traces reference .worktrees/verify-core-123-5684174a...; a concurrent verifier shares /tmp and clobbered the log, so the output is not attributable to this SHA. Rerun with a unique log path below."
  - attempted_at: "2026-08-27T17:46:00Z"
    command: "npm run plugin:check (retry after build)"
    cwd: ".worktrees/verify-skill-037-3267c7dfd416c63339c42c3ef0c2f0115ba0f973"
    exit_code: 0
    result: PASS
    summary: "plugin-sync OK — 38 tools match, bundle bytes match, 12 skill frontmatters parse, manifests at v0.3.12, isolated MCP handshake lists 38 tools"
  - attempted_at: "2026-08-27T18:00:00Z"
    command: "npm run verify (rerun; log .worktrees/verify-skill-037.log)"
    cwd: ".worktrees/verify-skill-037-3267c7dfd416c63339c42c3ef0c2f0115ba0f973"
    exit_code: 1
    result: FAIL
    summary: "Log attributable to this worktree (15 path mentions). Sole failure: packages/mcp-server src/http.test.mjs 'project resolution fails before binding and leaves no listener' — spawnSync node.exe ETIMEDOUT. Known host quirk (http spawn ETIMEDOUT) in a package this PR does not touch (see diff --stat attempt). All other verify steps (build, lint, typecheck, other package tests) passed. Not chased; hosted verify on the same SHA is authoritative below."
  - attempted_at: "2026-08-27T17:50:00Z"
    command: "gh run list --commit 3267c7dfd416c63339c42c3ef0c2f0115ba0f973; gh run view 33097415203"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "Hosted 'Pull request verification' run 33097415203 on headSha 3267c7dfd416c63339c42c3ef0c2f0115ba0f973 (push to main): status completed, conclusion success; jobs verify=success, regate=success, kanmer-gate=skipped."
  - attempted_at: "2026-08-27T17:22:30Z"
    command: "gh run view 33095985476 (PR-head run at e3354556)"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "conclusion success on headSha e3354556a9a40b11d5b4b849708306320162c7bc; jobs verify=success, kanmer-gate=success, regate=skipped."
  - attempted_at: "2026-08-27T17:52:00Z"
    command: "manual: (a) bots never a gate — read kanmer-review/SKILL.md"
    cwd: ".worktrees/verify-skill-037-3267c7dfd416c63339c42c3ef0c2f0115ba0f973"
    exit_code: null
    result: PASS
    summary: "kanmer-review/SKILL.md L81-82: 'Codex, GitHub code-review bots and similar automated commenters are **never** expected reviewers and never a gate'. No contrary gating prose in execute/verify/auto."
  - attempted_at: "2026-08-27T17:53:00Z"
    command: "manual: (b) Review → Implementing prose vs packages/core/src/store.ts backwardMoveEffects"
    cwd: ".worktrees/verify-skill-037-3267c7dfd416c63339c42c3ef0c2f0115ba0f973"
    exit_code: null
    result: PASS
    summary: "kanmer-review/SKILL.md L197-199: 'move_item refuses REVIEW_RETURN_NEEDS_ATTESTATION unless scratch/review.md is a valid needs-changes attestation whose pr matches an entry in the ticket's prs[] (or the reason begins operator:)'; L123-124 review_round counts returns, remediation_budget default 1. store.ts L836-861: bound = valid && verdict==='needs-changes' && prs.some(match); throws REVIEW_RETURN_NEEDS_ATTESTATION, REMEDIATION_BUDGET_EXHAUSTED when round >= budget (budget default 1, L825), operator: reason override L815-820. Consistent."
  - attempted_at: "2026-08-27T17:54:00Z"
    command: "manual: (c) failure_class table consistency across verify/auto/tool-reference"
    cwd: ".worktrees/verify-skill-037-3267c7dfd416c63339c42c3ef0c2f0115ba0f973"
    exit_code: null
    result: PASS
    summary: "kanmer-verify/SKILL.md L125 'failure_class: implementation | plan | transient | inconclusive', L144-147 routing table with 'Default for any non-PASS proof that names no class' = inconclusive; kanmer-auto/SKILL.md L140-145 same four routes, 'A proof without a class is inconclusive'; tool-reference.md L263-266 same enum and 'names no class is routed as inconclusive, never as a retryable transient'."
  - attempted_at: "2026-08-27T17:55:00Z"
    command: "manual: (d) closeout accepts WAIVED_BY_OPERATOR explicitly"
    cwd: ".worktrees/verify-skill-037-3267c7dfd416c63339c42c3ef0c2f0115ba0f973"
    exit_code: null
    result: PASS
    summary: "kanmer-closeout/SKILL.md L32-35: verified success is 'final proof result PASS, or WAIVED_BY_OPERATOR with the operator identity and reason in the proof body ... a waiver without those is not final'."
---

# Proof — SKILL-037

Verified at the exact PR #290 merge commit `3267c7dfd416c63339c42c3ef0c2f0115ba0f973` in a disposable detached worktree. The change is docs/skills only (5 SKILL.md files, tool-reference.md, `scripts/verify-skill-prose.mjs` and its test); `git diff --stat 5684174a..3267c7df` shows no `packages/` or `apps/` code changed.

All ticket-named checks pass locally: `verify:skills`, `verify:agents-block`, `verify-skill-prose.test.mjs`, `verify:docs`, `plugin:check` (after build). The full local `npm run verify` exits 1 solely on the known host quirk `packages/mcp-server` http spawn ETIMEDOUT, in code this PR does not touch; the hosted `verify` job on the same merge SHA (run 33097415203) succeeded and is taken as authoritative for that step. The first local `npm run verify` capture was discarded as INCONCLUSIVE because a concurrent verifier overwrote the shared `/tmp/verify.log`.

Manual acceptance (a)-(d) confirmed with line references above. Result: PASS.

## Closeout

- PR: https://github.com/collisionengineers/kanmer/pull/290
- Merged: 2026-08-27T17:14:47Z (squash merge 3267c7dfd416c63339c42c3ef0c2f0115ba0f973)
- Proof version at closeout: b2188d5bc59abca9 (PASS)
