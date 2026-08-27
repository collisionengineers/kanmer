---
kind: proof-record
merged_sha: "e903289eea919744d33eab4c3e965752e7a39cd9"
environment: "detached worktree .worktrees/verify-mcp-054-e903289eea919744d33eab4c3e965752e7a39cd9 (rev-parse HEAD = merge SHA, symbolic-ref empty, status clean); Windows 11 Pro 10.0.26200, Node v24.15.0, npm ci; log %TEMP%\\verify-mcp-054.log"
verified_at: "2026-08-27T20:12:27Z"
result: PASS
attempts:
  - attempted_at: "2026-08-27T19:58:40Z"
    command: "gh pr view 292 --json state,mergeCommit,url"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "state MERGED, mergeCommit.oid e903289eea919744d33eab4c3e965752e7a39cd9, url https://github.com/collisionengineers/kanmer/pull/292"
  - attempted_at: "2026-08-27T19:58:55Z"
    command: "git fetch origin && git worktree add --detach .worktrees/verify-mcp-054-e903289eea919744d33eab4c3e965752e7a39cd9 e903289eea919744d33eab4c3e965752e7a39cd9 && rev-parse/symbolic-ref/status && npm ci"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "HEAD e903289eea919744d33eab4c3e965752e7a39cd9, detached (symbolic-ref empty), '## HEAD (no branch)' clean; npm ci exit 0"
  - attempted_at: "2026-08-27T19:59:20Z"
    command: "npm run build"
    cwd: ".worktrees/verify-mcp-054-e903289eea919744d33eab4c3e965752e7a39cd9"
    exit_code: 0
    result: PASS
    summary: "all packages built incl. mcp-server dist (project-registry.ts, http.ts, index.ts entries)"
  - attempted_at: "2026-08-27T19:59:32Z"
    command: "node --test packages/mcp-server/src/project-registry.test.mjs"
    cwd: ".worktrees/verify-mcp-054-e903289eea919744d33eab4c3e965752e7a39cd9"
    exit_code: 0
    result: PASS
    summary: "tests 5, pass 5, fail 0 (confirmed with --test-reporter=tap)"
  - attempted_at: "2026-08-27T19:59:33Z"
    command: "node packages/mcp-server/src/smoke.mjs"
    cwd: ".worktrees/verify-mcp-054-e903289eea919744d33eab4c3e965752e7a39cd9"
    exit_code: 0
    result: PASS
    summary: "290/290 checks passed; tools/list returns 39 tools"
  - attempted_at: "2026-08-27T19:59:54Z"
    command: "npm run smoke:protocol"
    cwd: ".worktrees/verify-mcp-054-e903289eea919744d33eab4c3e965752e7a39cd9"
    exit_code: 0
    result: PASS
    summary: "50/50 checks passed; 39 tools on every protocol version"
  - attempted_at: "2026-08-27T19:59:59Z"
    command: "npm run test:http -w @kanmer/mcp-server"
    cwd: ".worktrees/verify-mcp-054-e903289eea919744d33eab4c3e965752e7a39cd9"
    exit_code: 0
    result: PASS
    summary: "HTTP test suite green, exit 0"
  - attempted_at: "2026-08-27T20:00:22Z"
    command: "npm run smoke:http"
    cwd: ".worktrees/verify-mcp-054-e903289eea919744d33eab4c3e965752e7a39cd9"
    exit_code: 0
    result: PASS
    summary: "PASS HTTP initialize/tools/list/session/delete smoke; smoke-http.mjs asserts readiness event carries project_id/board_id/identity (acceptance d)"
  - attempted_at: "2026-08-27T20:00:34Z"
    command: "npm run plugin:check"
    cwd: ".worktrees/verify-mcp-054-e903289eea919744d33eab4c3e965752e7a39cd9"
    exit_code: 0
    result: PASS
    summary: "plugin-sync OK — 39 tools match, bundle bytes match, 12 skill frontmatters parse, manifests v0.3.12, isolated handshake lists 39 tools"
  - attempted_at: "2026-08-27T20:00:36Z"
    command: "npm run typecheck"
    cwd: ".worktrees/verify-mcp-054-e903289eea919744d33eab4c3e965752e7a39cd9"
    exit_code: 0
    result: PASS
    summary: "typecheck clean"
  - attempted_at: "2026-08-27T20:01:12Z"
    command: "npm run verify"
    cwd: ".worktrees/verify-mcp-054-e903289eea919744d33eab4c3e965752e7a39cd9"
    exit_code: 1
    result: FAIL
    summary: "Rail failed at step 'npm test' (finished 20:08:42): 2 of 121 node tests fail — 'the quote-free launcher still reaches the shim when LOCALAPPDATA contains spaces' and 'the shipped installer shim restores the provider cwd before MCP launch', both EBUSY rmdir on temp 'Kanmer Test Space\\Kanmer\\bin' (antigravity installer-shim fixtures). Vitest 19/19 and 50/50 files passed; mcp-server suite 123/123. Known Windows host quirk: `git diff --stat 97dfc9f3..e903289e` (16 files) touches only packages/mcp-server, docs, plugin tool-reference, AGENTS.md and the generated manual chapter — no installer/antigravity code. Hosted CI at the same SHA is green (next attempt)."
  - attempted_at: "2026-08-27T20:09:10Z"
    command: "gh run list --commit e903289eea919744d33eab4c3e965752e7a39cd9 --json databaseId,name,status,conclusion,headSha"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "Run 33110951030 'Pull request verification' at e903289e: completed, success"
  - attempted_at: "2026-08-27T20:09:10Z"
    command: "gh run view 33109883385 --json status,conclusion,headSha,jobs"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "PR-head run at fe612e6d3d1c6fdcbdb54b439d5bd1eded6f03dc: completed success; jobs verify=success, kanmer-gate=success, regate=skipped"
  - attempted_at: "2026-08-27T20:12:27Z"
    command: "manual (a): copy .worktrees/kanmer/.kanmer to two temp boards A and B, migrate_board on each via built dist/index.js (stdio), registry file {schema:1, endpoints:{alpha:A, beta:B, broken:{boardRoot:'relative/not/absolute', policy:5}}}, server bound to A with KANMER_ENDPOINT_REGISTRY, call list_projects"
    cwd: ".worktrees/verify-mcp-054-e903289eea919744d33eab4c3e965752e7a39cd9"
    exit_code: 0
    result: PASS
    summary: "A project_id 27cf31e5-40a3-4e6d-a40b-77afe9cf21b4, B project_id 8c59ae11-b3d7-4d17-92f9-be6b59d293c7 (distinct, identity logical); list_projects: registry.error null, bound.endpoint 'alpha', alpha health ok bound true, beta health ok bound false with B's project_id. Earlier run with a wrong schema string was reported as registry.error 'registry schema must be 1' (verifier error, server behaved correctly)."
  - attempted_at: "2026-08-27T20:12:27Z"
    command: "manual (b): from server bound to A, append_scratch MCP-054 with expected_project = B's project_id; sha256 over both board trees before/after"
    cwd: ".worktrees/verify-mcp-054-e903289eea919744d33eab4c3e965752e7a39cd9"
    exit_code: 0
    result: PASS
    summary: "isError true, structuredContent.error.code WRONG_PROJECT ('expected project 8c59ae11... does not match: this project is project_id 27cf31e5...'); A tree hash unchanged, B tree hash unchanged"
  - attempted_at: "2026-08-27T20:12:27Z"
    command: "manual (c): scan all 39 tools/list inputSchema properties for root, path, cwd, board, boardRoot, repoRoot, project_root, directory"
    cwd: ".worktrees/verify-mcp-054-e903289eea919744d33eab4c3e965752e7a39cd9"
    exit_code: 0
    result: PASS
    summary: "No root/cwd/board/boardRoot/repoRoot/project_root/directory property on any tool; list_projects takes only a name filter. Only hits are pre-existing get_group_doc.path / set_group_doc.path ('Path within the group folder, e.g. context.md') and link_doc.path ('Repo-relative path, e.g. docs/prd/checkout.md') — document identifiers inside the bound board/repo, present at 97dfc9f3 before this PR, not request-selected filesystem roots."
  - attempted_at: "2026-08-27T20:00:22Z"
    command: "manual (d): HTTP host readiness event carries project_id"
    cwd: ".worktrees/verify-mcp-054-e903289eea919744d33eab4c3e965752e7a39cd9"
    exit_code: 0
    result: PASS
    summary: "Covered by npm run smoke:http (exit 0): packages/mcp-server/src/smoke-http.mjs lines 114-116 assert 'project_id' and 'board_id' in the kanmer-mcp-http-ready event and identity logical/unassigned; http.ts emits project_id in the ready record."
  - attempted_at: "2026-08-27T20:12:27Z"
    command: "manual (e): registry entry 'broken' with relative boardRoot and numeric policy; sha256 of registry file before/after"
    cwd: ".worktrees/verify-mcp-054-e903289eea919744d33eab4c3e965752e7a39cd9"
    exit_code: 0
    result: PASS
    summary: "Entry reported with health 'invalid', problems ['boardRoot must be an absolute path','policy must be a string'], not dropped (3 endpoints listed); registry file hash identical before/after."
---

# Proof — MCP-054

Independent verification at the exact PR #292 merge commit
`e903289eea919744d33eab4c3e965752e7a39cd9` in a disposable detached worktree.
All deterministic packet checks passed with exit 0 except `npm run verify`,
whose sole failures are the two known antigravity installer-shim EBUSY tests on
this Windows host (outside the PR's diff; hosted CI at the same SHA succeeded).
All five manual acceptance checks (a)-(e) were performed against throwaway
copies of the board and passed; no real board, registry, or worktree other
than the verification worktree was modified. Temporary boards, registry file
and the acceptance script were deleted afterwards; `git status` in the
verification worktree stayed clean.
