---
kind: proof-record
merged_sha: "5684174ae60ae2d67874a63c1e0c308b29327c38"
environment: "detached worktree .worktrees/verify-core-123-5684174ae60ae2d67874a63c1e0c308b29327c38 (HEAD 5684174a, no branch, clean); Windows 11 Pro 10.0.26200, Node v24.15.0, npm ci; hosted GitHub Actions run 33095640744 on the merge SHA"
verified_at: "2026-08-27T17:27:00Z"
result: PASS
attempts:
  - attempted_at: "2026-08-27T16:58:00Z"
    command: "gh pr view 288 --json state,mergeCommit,url"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "state MERGED, mergeCommit.oid 5684174ae60ae2d67874a63c1e0c308b29327c38, url https://github.com/collisionengineers/kanmer/pull/288"
  - attempted_at: "2026-08-27T16:58:30Z"
    command: "git fetch origin && git worktree add --detach .worktrees/verify-core-123-5684174ae60ae2d67874a63c1e0c308b29327c38 5684174ae60ae2d67874a63c1e0c308b29327c38; rev-parse HEAD; symbolic-ref --short -q HEAD; status --short --branch; npm ci"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "HEAD = 5684174ae60ae2d67874a63c1e0c308b29327c38; symbolic-ref exit 1 (detached); status '## HEAD (no branch)' clean; npm ci exit 0"
  - attempted_at: "2026-08-27T17:00:00Z"
    command: "npm run build"
    cwd: ".worktrees/verify-core-123-5684174ae60ae2d67874a63c1e0c308b29327c38"
    exit_code: 0
    result: PASS
    summary: "core, gui, mcp-server and standalone bundles built (kanmer-mcp.cjs, doctor-cli.cjs, remote-cli.cjs)"
  - attempted_at: "2026-08-27T17:01:00Z"
    command: "npm test -w @kanmer/core -- merge-gate"
    cwd: ".worktrees/verify-core-123-5684174ae60ae2d67874a63c1e0c308b29327c38"
    exit_code: 0
    result: PASS
    summary: "1 file, 16 tests passed"
  - attempted_at: "2026-08-27T17:01:20Z"
    command: "npm test -w @kanmer/core -- review-attestation"
    cwd: ".worktrees/verify-core-123-5684174ae60ae2d67874a63c1e0c308b29327c38"
    exit_code: 0
    result: PASS
    summary: "1 file, 3 tests passed"
  - attempted_at: "2026-08-27T17:01:40Z"
    command: "node --test packages/mcp-server/src/check-pr.test.mjs"
    cwd: ".worktrees/verify-core-123-5684174ae60ae2d67874a63c1e0c308b29327c38"
    exit_code: 0
    result: PASS
    summary: "exit 0, no failing tests (includes 'SYNC_REQUIRED compares the attested board_sha with the fetched board tip')"
  - attempted_at: "2026-08-27T17:01:50Z"
    command: "node --test scripts/pr-workflow.test.mjs"
    cwd: ".worktrees/verify-core-123-5684174ae60ae2d67874a63c1e0c308b29327c38"
    exit_code: 0
    result: PASS
    summary: "exit 0, no failing tests"
  - attempted_at: "2026-08-27T17:02:00Z"
    command: "npm run plugin:check"
    cwd: ".worktrees/verify-core-123-5684174ae60ae2d67874a63c1e0c308b29327c38"
    exit_code: 0
    result: PASS
    summary: "plugin-sync OK: 38 tools match, bundle bytes match, 12 skill frontmatters parse, manifests v0.3.12, isolated MCP handshake lists 38 tools"
  - attempted_at: "2026-08-27T17:02:10Z"
    command: "node packages/mcp-server/src/smoke.mjs"
    cwd: ".worktrees/verify-core-123-5684174ae60ae2d67874a63c1e0c308b29327c38"
    exit_code: 0
    result: PASS
    summary: "258/258 checks passed"
  - attempted_at: "2026-08-27T17:03:00Z"
    command: "npx vitest run src/main/kanmerGit.test.ts src/main/settings.test.ts --root apps/gui"
    cwd: ".worktrees/verify-core-123-5684174ae60ae2d67874a63c1e0c308b29327c38"
    exit_code: 0
    result: PASS
    summary: "2 files passed: settings.test.ts 12 tests, kanmerGit.test.ts 54 tests (402.9 s) including 'pauses without committing markers when the autostash re-apply conflicts' (11.2 s). No orphan-cleanup or hook-timeout flake observed on this run."
  - attempted_at: "2026-08-27T17:10:00Z"
    command: "gh run list --commit 5684174ae60ae2d67874a63c1e0c308b29327c38 --json databaseId,name,status,conclusion,event,headSha (polled until completed)"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "Hosted run 33095640744 'Pull request verification', event push, headSha 5684174ae60ae2d67874a63c1e0c308b29327c38, status completed, conclusion success. This is merge-SHA-bound hosted evidence (pr.yml now triggers on push to main)."
  - attempted_at: "2026-08-27T17:10:30Z"
    command: "gh run view 33093680581 --json headSha,status,conclusion; git diff --stat df293ad2 5684174a"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "PR-head run 33093680581 at df293ad2bf4b7f603e67998be7cb5b62f9430cbe: completed/success. Tree diff df293ad2..5684174a is empty, so the PR-head run exercised the identical tree."
  - attempted_at: "2026-08-27T17:12:00Z"
    command: "node ./.verify-sync-fixture.mjs (throwaway script: temp board init via KanmerStore, git init kanmer-board, v1 + v2 commits, diverged sibling of v1 via commit-tree, attestation board_sha = diverged; run packages/mcp-server/src/check-pr.mjs with KANMER_GATE_STRICT unset then =1; script deleted afterwards, worktree clean)"
    cwd: ".worktrees/verify-core-123-5684174ae60ae2d67874a63c1e0c308b29327c38"
    exit_code: 0
    result: PASS
    summary: "Manual (a): non-strict -> exit 0, ok=true, SYNC_REQUIRED level=warning outcome=warn state=stale, '::warning title=kanmer/gate [SYNC_REQUIRED]::review attestation board 1a9e28d4... is not an ancestor of the fetched board tip 9661c408...'. strict -> exit 1, ok=false, level=error outcome=fail state=stale, '::error title=kanmer/gate [SYNC_REQUIRED]::...'."
  - attempted_at: "2026-08-27T17:14:00Z"
    command: "manual (b): syncBoard autostash-conflict scenario"
    cwd: ".worktrees/verify-core-123-5684174ae60ae2d67874a63c1e0c308b29327c38"
    exit_code: null
    result: PASS
    summary: "Not reproduced by hand; relied on the shipped real-git test 'ensureBoardWorktree reconciliation > pauses without committing markers when the autostash re-apply conflicts' which passed in the vitest run above (11.2 s)."
  - attempted_at: "2026-08-27T17:16:00Z"
    command: "git clone --branch kanmer-board <repo> $TMP/board; update-ref refs/remotes/origin/kanmer-board HEAD~2; empty commit; JSON-RPC initialize + tools/call get_status | node packages/mcp-server/dist/standalone/kanmer-mcp.cjs --root $TMP/board"
    cwd: ".worktrees/verify-core-123-5684174ae60ae2d67874a63c1e0c308b29327c38"
    exit_code: 0
    result: PASS
    summary: "Manual (c) on a throwaway copy of the board (live board and .worktrees/kanmer untouched): get_status returned boardSync { remoteBranch: kanmer-board, localSha 45906eb6, remoteSha b31296d8, ahead: 3, behind: 0 }, matching 'git rev-list --left-right --count HEAD...origin/kanmer-board' = 3 0. Temp copy removed."
  - attempted_at: "2026-08-27T17:05:00Z"
    command: "npm run verify"
    cwd: ".worktrees/verify-core-123-5684174ae60ae2d67874a63c1e0c308b29327c38"
    exit_code: 1
    result: FAIL
    summary: "check:manual OK; core vitest 18 files passed; gui vitest 50 files passed; test:http 118 tests, 117 pass, 1 fail: http.test.mjs:65 'project resolution fails before binding and leaves no listener' with spawnSync node.exe ETIMEDOUT (2 s child timeout under load). Chain stopped before test:scripts. Known host quirk; packages/mcp-server/src/http.test.mjs is not in 'git diff --stat a8318ea6..5684174a'."
  - attempted_at: "2026-08-27T17:20:00Z"
    command: "npm run test:http -w @kanmer/mcp-server"
    cwd: ".worktrees/verify-core-123-5684174ae60ae2d67874a63c1e0c308b29327c38"
    exit_code: 1
    result: FAIL
    summary: "Retry: 118 tests, 117 pass, 1 fail — same http.test.mjs:65 ETIMEDOUT."
  - attempted_at: "2026-08-27T17:24:00Z"
    command: "node --test src/http.test.mjs"
    cwd: ".worktrees/verify-core-123-5684174ae60ae2d67874a63c1e0c308b29327c38/packages/mcp-server"
    exit_code: 0
    result: PASS
    summary: "http.test.mjs in isolation: 5 tests, 5 pass, 0 fail — the ETIMEDOUT is load-dependent host flakiness, not a regression."
  - attempted_at: "2026-08-27T17:22:00Z"
    command: "npm run test:scripts"
    cwd: ".worktrees/verify-core-123-5684174ae60ae2d67874a63c1e0c308b29327c38"
    exit_code: 1
    result: FAIL
    summary: "120 tests, 118 pass, 2 fail, both in scripts/antigravity-plugin-config.test.mjs ('the quote-free launcher still reaches the shim when LOCALAPPDATA contains spaces', 'the shipped installer shim restores the provider cwd before MCP launch'): 'Command failed: cmd.exe ... pushd !LOCALAPPDATA!\\Kanmer\\bin && call kanmer-mcp.cmd'. These exercise the host-installed shim under %LOCALAPPDATA%\\Kanmer\\bin. Known antigravity host quirk; only scripts/pr-workflow.test.mjs under scripts/ is touched by the merge (and it passed)."
  - attempted_at: "2026-08-27T17:26:00Z"
    command: "node --test scripts/antigravity-plugin-config.test.mjs"
    cwd: ".worktrees/verify-core-123-5684174ae60ae2d67874a63c1e0c308b29327c38"
    exit_code: 1
    result: FAIL
    summary: "Isolated rerun: 4 tests, 2 pass, 2 fail (same two installed-shim tests). Deterministic on this host, unrelated to the merged files; hosted run 33095640744 on the merge SHA is green."
---

# Proof — CORE-123 at 5684174ae60ae2d67874a63c1e0c308b29327c38

Verified by an independent verifier (not the implementer or reviewer) in a disposable detached worktree bound to PR #288's GitHub `mergeCommit`.

## Merge identity

- PR: https://github.com/collisionengineers/kanmer/pull/288 — `MERGED`, `mergeCommit.oid` `5684174ae60ae2d67874a63c1e0c308b29327c38`.
- Merge touches 24 files (`git diff --stat a8318ea6..5684174a`): `.github/workflows/board-regate.yml`, `.github/workflows/pr.yml`, `AGENTS.md`, `apps/gui/src/main/{kanmerGit,settings}{.ts,.test.ts}`, `apps/gui/src/renderer/src/components/Settings.tsx`, `apps/gui/src/shared/ipc.ts`, ADR-0011, ADR-0016, `packages/core/src/{merge-gate,review-attestation}{.ts,.test.ts}`, `packages/mcp-server/src/{check-pr.mjs,check-pr.test.mjs,git-reachability.mjs,index.ts,smoke.mjs}`, `plugins/kanmer/mcp/kanmer-mcp.cjs`, `plugins/kanmer/skills/kanmer-review/SKILL.md`, tool-reference.md, `scripts/pr-workflow.test.mjs`.

## Hosted evidence

- Run 33095640744 (`push` to main, headSha = merge SHA) completed with conclusion `success` — exact merge-SHA-bound hosted evidence.
- PR-head run 33093680581 at df293ad2 completed `success`; `git diff --stat df293ad2 5684174a` is empty, so both runs exercised the same tree.

## Verdict

All packet-named deterministic checks pass at the merge SHA. Manual acceptance (a) and (c) reproduced on throwaway fixtures; (b) relies on the shipped real-git autostash-conflict test, which passed. The only failures are the two documented host quirks (`http.test.mjs` spawnSync ETIMEDOUT under load — passes in isolation; `antigravity-plugin-config.test.mjs` installed-shim tests), both in files the merge does not touch and both green in the hosted run. Result: PASS.

## Closeout

- PR: https://github.com/collisionengineers/kanmer/pull/288
- Merged: 2026-08-27T16:54:22Z (merge SHA 5684174ae60ae2d67874a63c1e0c308b29327c38)
- Closed out 2026-08-27 by claude-code (worktree and branch removed, ticket released).
