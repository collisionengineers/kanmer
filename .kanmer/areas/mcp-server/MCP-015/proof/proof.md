---
kind: proof-record
merged_sha: "3f4233789363a36631ee0f8e2f60e33fa84e2619"
environment: "detached worktree .worktrees/verify-mcp-015-3f423378 at exact PR #152 merge SHA; Windows 11; Node/npm workspace"
verified_at: "2026-08-22T04:46:53.4937481Z"
result: PASS
attempts:
  - attempted_at: "2026-08-22T04:39:00Z"
    command: "npm test"
    cwd: ".worktrees/verify-mcp-015-3f423378"
    exit_code: 1
    result: FAIL
    summary: "Clean detached worktree used the root workspace junction's pre-merge packages/core/dist; core 269/269 passed but GUI dispatch could not resolve the merged Antigravity provider (3 suites failed)."
  - attempted_at: "2026-08-22T04:40:00Z"
    command: "npm run build:core"
    cwd: ".worktrees/verify-mcp-015-3f423378"
    exit_code: 0
    result: PASS
    summary: "Built the exact merged core package; a detached-worktree @kanmer/core junction was used so workspace consumers loaded this build."
  - attempted_at: "2026-08-22T04:41:00Z"
    command: "npm test"
    cwd: ".worktrees/verify-mcp-015-3f423378"
    exit_code: 1
    result: FAIL
    summary: "After the core rebuild, the parallel runner had an unhandled Windows EPERM opening the MCP-024 dispatch temp log; no assertion failure was reported."
  - attempted_at: "2026-08-22T04:42:00Z"
    command: "npm run check:manual"
    cwd: ".worktrees/verify-mcp-015-3f423378"
    exit_code: 0
    result: PASS
    summary: "Manual proof chapters current (22 chapters)."
  - attempted_at: "2026-08-22T04:42:30Z"
    command: "npm run test -w @kanmer/core -- --no-file-parallelism"
    cwd: ".worktrees/verify-mcp-015-3f423378"
    exit_code: 0
    result: PASS
    summary: "13 core files, 269/269 tests passed."
  - attempted_at: "2026-08-22T04:43:00Z"
    command: "npm run test -w @kanmer/gui -- --no-file-parallelism"
    cwd: ".worktrees/verify-mcp-015-3f423378"
    exit_code: 0
    result: PASS
    summary: "39 GUI files, 362/362 tests passed, including Antigravity provider and dispatch coverage."
  - attempted_at: "2026-08-22T04:43:30Z"
    command: "npm run test:http -w @kanmer/mcp-server"
    cwd: ".worktrees/verify-mcp-015-3f423378"
    exit_code: 0
    result: PASS
    summary: "HTTP/protocol suite passed 61/61; ESM and standalone bundles rebuilt."
  - attempted_at: "2026-08-22T04:44:00Z"
    command: "npm run test:scripts"
    cwd: ".worktrees/verify-mcp-015-3f423378"
    exit_code: 0
    result: PASS
    summary: "Dependency-free script suite passed 83/83."
  - attempted_at: "2026-08-22T04:44:20Z"
    command: "npm run typecheck"
    cwd: ".worktrees/verify-mcp-015-3f423378"
    exit_code: 0
    result: PASS
    summary: "All workspaces typechecked successfully."
  - attempted_at: "2026-08-22T04:44:30Z"
    command: "npm run verify:docs"
    cwd: ".worktrees/verify-mcp-015-3f423378"
    exit_code: 0
    result: PASS
    summary: "Governing document links and references verified."
  - attempted_at: "2026-08-22T04:44:40Z"
    command: "npm run verify:skills"
    cwd: ".worktrees/verify-mcp-015-3f423378"
    exit_code: 0
    result: PASS
    summary: "Skill trees and frontmatter verified."
  - attempted_at: "2026-08-22T04:44:50Z"
    command: "npm run plugin:build && npm run plugin:check"
    cwd: ".worktrees/verify-mcp-015-3f423378"
    exit_code: 0
    result: PASS
    summary: "Fresh standalone plugin bundle matched committed bytes; 34 tools, 12 skill frontmatters, manifests, and isolated handshake verified."
  - attempted_at: "2026-08-22T04:45:00Z"
    command: "git diff --check"
    cwd: ".worktrees/verify-mcp-015-3f423378"
    exit_code: 0
    result: PASS
    summary: "No whitespace errors."
  - attempted_at: "2026-08-22T04:45:30Z"
    command: "Hosted PR verification"
    cwd: "GitHub Actions run 32552010309, job 96980185214"
    exit_code: 0
    result: PASS
    summary: "The merged PR head passed the hosted verification job."
  - attempted_at: "2026-08-22T04:46:00Z"
    command: "Authenticated Antigravity install/uninstall, bound get_status, unbound control, and IDE dispatch"
    cwd: "manual external host"
    exit_code: null
    result: INCONCLUSIVE
    summary: "No safe authenticated Antigravity host/IDE session was available in this environment; no external capability is inferred from fixtures or static checks."
---

## Verification scope

Verified PR #152 at its GitHub merge commit `3f4233789363a36631ee0f8e2f60e33fa84e2619` in disposable detached worktree .worktrees/verify-mcp-015-3f423378. The ticket-worktree implementation was independently reviewed before merge; hosted verification passed run 32552010309/job 96980185214.

The first two `npm test` attempts are retained exactly: the first exposed stale root workspace build output in the clean detached worktree, and the second exposed a Windows parallel-runner EPERM while opening a temporary dispatch log. The deterministic serialized suites then passed, including GUI 362/362, core 269/269, HTTP 61/61, scripts 83/83, typecheck, docs, skills, plugin byte/handshake checks, and diff check. The external authenticated Antigravity/IDE lane is explicitly INCONCLUSIVE because the required host session and credentials were unavailable; this proof makes no claim about that lane.


## 2026-08-23 OAuth-backed final descriptor verification

- [x] Final merged descriptor verified from exact MCP-046 merge `8554c733aac5817e99909622e062d022d6c12be3` in disposable detached worktree `.worktrees/prove-mcp015`.
- [x] `agy plugin install C:\\Users\\Alex\\Documents\\GitHub\\kanmer\\.worktrees\\prove-mcp015\\plugins\\kanmer` exited 0 and reported `skills: 12 processed` and `mcpServers: 1 processed`.
- [x] `agy plugin validate <pluginRoot>` exited 0 with the same 12-skill/one-MCP result.
- [x] `agy plugin list` exited 0 and reported the installed `kanmer` entry with `components: ["skills","mcpServers"]`. The pre-existing Claude Code import is retained as user state.
- [x] Fresh OAuth-backed project-bound process:
  `agy --dangerously-skip-permissions --add-dir C:\\Users\\Alex\\Documents\\GitHub\\kanmer --print "Use only the Kanmer MCP get_status tool for this project. Do not use filesystem or shell tools. Return exactly KANMER_AGY_MCP015_FINAL_OK and no other text."`
  exited 0 and returned exactly `KANMER_AGY_MCP015_FINAL_OK`.
- [ ] Antigravity has no `plugin inspect` subcommand (help returned exit 1); this is recorded as a command-surface limitation, not treated as an install failure.
- [ ] IDE dispatch, unbound negative control, and post-uninstall absence/idempotence were not exercised in this run; no claim is made for those boundaries. The prior deterministic and static rails remain retained above.

This proves the shipped native plugin descriptor is discoverable and that a real OAuth-backed Antigravity process, bound to the source root, called the Kanmer MCP `get_status` tool through the final launcher.
