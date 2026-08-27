---
kind: proof-record
merged_sha: "97dfc9f3b446819ed626b4f94008aae6d7a7d0f5"
environment: ".worktrees/verify-core-114-97dfc9f3b446819ed626b4f94008aae6d7a7d0f5 (detached, clean, npm ci) — Windows 11 Pro 10.0.26200, Node v24.15.0, git; manual acceptance on mkdtemp copies of .worktrees/kanmer/.kanmer only"
verified_at: "2026-08-27T19:20:00Z"
result: PASS
attempts:
  - attempted_at: "2026-08-27T19:04:30Z"
    command: "gh pr view 291 --json state,mergeCommit,url"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "state MERGED, mergeCommit.oid 97dfc9f3b446819ed626b4f94008aae6d7a7d0f5, https://github.com/collisionengineers/kanmer/pull/291"
  - attempted_at: "2026-08-27T19:05:00Z"
    command: "git fetch origin && git worktree add --detach .worktrees/verify-core-114-97dfc9f3b446819ed626b4f94008aae6d7a7d0f5 97dfc9f3b446819ed626b4f94008aae6d7a7d0f5 && rev-parse HEAD / symbolic-ref / status --short --branch && npm ci"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "HEAD 97dfc9f3b446819ed626b4f94008aae6d7a7d0f5, symbolic-ref empty (detached), status '## HEAD (no branch)' clean; npm ci exit 0. Not .worktrees/kanmer nor .worktrees/core-114."
  - attempted_at: "2026-08-27T19:06:00Z"
    command: "npm run build"
    cwd: ".worktrees/verify-core-114-97dfc9f3b446819ed626b4f94008aae6d7a7d0f5"
    exit_code: 0
    result: PASS
    summary: "All packages built; standalone dist/standalone/kanmer-mcp.cjs 1.59 MB, build success"
  - attempted_at: "2026-08-27T19:07:01Z"
    command: "npm test -w @kanmer/core"
    cwd: ".worktrees/verify-core-114-97dfc9f3b446819ed626b4f94008aae6d7a7d0f5"
    exit_code: 0
    result: PASS
    summary: "19 files, 396/396 tests passed (includes project.test.ts concurrent-init tests), 43.4 s"
  - attempted_at: "2026-08-27T19:07:46Z"
    command: "node packages/mcp-server/src/smoke.mjs"
    cwd: ".worktrees/verify-core-114-97dfc9f3b446819ed626b4f94008aae6d7a7d0f5"
    exit_code: 0
    result: PASS
    summary: "278/278 checks passed (incl. FRD-029 identity, WRONG_PROJECT, REVISION_CONFLICT, copied-board and legacy-board checks)"
  - attempted_at: "2026-08-27T19:08:05Z"
    command: "npm run smoke:protocol"
    cwd: ".worktrees/verify-core-114-97dfc9f3b446819ed626b4f94008aae6d7a7d0f5"
    exit_code: 0
    result: PASS
    summary: "50/50 checks passed"
  - attempted_at: "2026-08-27T19:08:10Z"
    command: "npm run test:http -w @kanmer/mcp-server"
    cwd: ".worktrees/verify-core-114-97dfc9f3b446819ed626b4f94008aae6d7a7d0f5"
    exit_code: 0
    result: PASS
    summary: "node:test pass 118, fail 0"
  - attempted_at: "2026-08-27T19:08:29Z"
    command: "npm run plugin:check"
    cwd: ".worktrees/verify-core-114-97dfc9f3b446819ed626b4f94008aae6d7a7d0f5"
    exit_code: 0
    result: PASS
    summary: "plugin-sync OK — 38 tools match, bundle bytes match, 12 skill frontmatters parse, manifests v0.3.12, isolated handshake lists 38 tools"
  - attempted_at: "2026-08-27T19:08:32Z"
    command: "npm run verify"
    cwd: ".worktrees/verify-core-114-97dfc9f3b446819ed626b4f94008aae6d7a7d0f5"
    exit_code: 1
    result: FAIL
    summary: "Chain failed in scripts tests (121 tests, 2 failed): 'the quote-free launcher still reaches the shim when LOCALAPPDATA contains spaces' and 'the shipped installer shim restores the provider cwd before MCP launch' — both EBUSY rmdir on %TEMP%\\kanmer-agy-*\\Kanmer Test Space\\Kanmer\\bin (scripts/antigravity-plugin-config.test.mjs). Known Windows host quirk; scripts/antigravity-plugin-config.test.mjs is not in `git diff --stat 3267c7df..97dfc9f3` (18 files: core, mcp-server, plugin bundle, skills, AGENTS.md). Core, mcp-server and http suites in the same chain all passed (118 pass). Covered by the hosted run below."
  - attempted_at: "2026-08-27T19:14:00Z"
    command: "gh run list --commit 97dfc9f3b446819ed626b4f94008aae6d7a7d0f5; gh run view 33106667700; gh run view 33106086301"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "Push-to-main run 33106667700 at 97dfc9f3 (Pull request verification): completed/success — jobs verify success, regate success, kanmer-gate skipped (push). PR-head run 33106086301 at 631e3a0e: completed/success (verify + kanmer-gate). https://github.com/collisionengineers/kanmer/actions/runs/33106667700"
  - attempted_at: "2026-08-27T19:15:30Z"
    command: "manual (a) first attempt: two mkdtemp copies of the LIVE legacy board (no project.json) served by dist/standalone/kanmer-mcp.cjs"
    cwd: "%TEMP%\\core114-a1-*, core114-a2-*"
    exit_code: 1
    result: FAIL
    summary: "project_id null on both copies — reads never allocate identity; the live board is legacy and unmigrated, so the check was mis-set-up (identity must be assigned once via migrate_board before copying). Location fingerprints did differ. Retained; re-run below with a seeded copy."
  - attempted_at: "2026-08-27T19:16:39Z"
    command: "manual (a0)+(a): copy live board → seed copy, migrate_board(expected_project=<seed fingerprint>) on the seed, copy seed .kanmer to two paths, get_status via dist/standalone/kanmer-mcp.cjs on each"
    cwd: "%TEMP%\\core114-seed-*, core114-a1-Lq6YWS, core114-a2-6YRtv7"
    exit_code: 0
    result: PASS
    summary: "Seed: identity unassigned before, logical/migrated after, project_id 694be8c1-69bc-4611-85a4-b32e6fb09d45, project.json created. Both copies report the identical project_id; location fingerprints differ (kanmer-loc-v1:c799ef40… vs kanmer-loc-v1:37174fc5…)"
  - attempted_at: "2026-08-27T19:16:40Z"
    command: "manual (b): update_item CORE-114 title with expected_project=kanmer-proj-v1:000…0 on copy A1; sha256 tree hash of .kanmer before/after"
    cwd: "%TEMP%\\core114-a1-Lq6YWS"
    exit_code: 0
    result: PASS
    summary: "isError true, error.code WRONG_PROJECT; .kanmer tree hash identical before/after (no bytes written)"
  - attempted_at: "2026-08-27T19:16:41Z"
    command: "manual (c): get_item revision, set_ticket_doc proof, get_item again; then update_item and set_ticket_doc with the stale expected_revision"
    cwd: "%TEMP%\\core114-a1-Lq6YWS"
    exit_code: 0
    result: PASS
    summary: "revision rev1:20fb9710dc09041c → rev1:58258a7528b7f0d7 while updated stayed 2026-08-27T19:04:49.086Z; both stale mutations refused with REVISION_CONFLICT and .kanmer tree hash unchanged (zero writes)"
  - attempted_at: "2026-08-27T19:16:42Z"
    command: "manual (d): legacy copy without project.json; 4× new KanmerStore(root).init({fallbackFingerprint}) concurrently via packages/core/dist/index.js"
    cwd: "%TEMP%\\core114-d-3Lrqd5"
    exit_code: 0
    result: PASS
    summary: "one project_id (0eaae787-deed-4278-aa4b-65452212640d) across all 4 stores, exactly 1 project_id activity entry, no .tmp-* leftovers"
  - attempted_at: "2026-08-27T19:16:43Z"
    command: "manual (e): INSTALLED C:\\Users\\Alex\\AppData\\Local\\Programs\\Kanmer\\resources\\plugins\\kanmer\\mcp\\kanmer-mcp.cjs (v0.3.12) against copy A2 that has project.json: get_status, get_item, append_scratch, get_ticket_doc"
    cwd: "%TEMP%\\core114-a2-6YRtv7"
    exit_code: 0
    result: PASS
    summary: "server.version 0.3.12; read ok; append_scratch write ok and readable; project.json bytes identical before/after"
---

# Proof — CORE-114 logical project identity and revision-safe mutation contracts

Verified at the exact PR #291 merge commit `97dfc9f3b446819ed626b4f94008aae6d7a7d0f5` in a disposable detached worktree. All packet checks passed locally except the `npm run verify` chain, which failed only on the known Windows EBUSY quirk in `scripts/antigravity-plugin-config.test.mjs` (untouched by this change per `git diff --stat 3267c7df..97dfc9f3`); the hosted push-to-main `verify` run 33106667700 at this SHA succeeded, as did PR-head run 33106086301. The FRD-029 acceptance ("same board at different paths retains identity; wrong endpoint and stale revision writes are refused") was exercised manually on throwaway copies, never the live board; the installed v0.3.12 server remains forward-compatible with a board carrying `project.json`. Logs: `%TEMP%\verify-core-114-*.log`.

## Closeout

- PR: https://github.com/collisionengineers/kanmer/pull/291
- Merged: 2026-08-27T19:04:35Z (squash merge 97dfc9f3b446819ed626b4f94008aae6d7a7d0f5)
- Closed out 2026-08-27 by claude-code (auto run); proof version a12d28c8dc906d78, result PASS.
