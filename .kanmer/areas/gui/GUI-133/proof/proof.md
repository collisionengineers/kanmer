---
kind: proof-record
merged_sha: "f0815bfdbb19de427488b5179127bbd454b17350"
environment: "Windows 11; detached exact-SHA worktree .worktrees/verify-gui-133-f0815bfdbb19de427488b5179127bbd454b17350; Node/npm workspace; packaged installer installed under LOCALAPPDATA"
verified_at: "2026-08-25T03:47:11.245Z"
result: PASS
attempts:
  - attempted_at: "2026-08-25T03:38:00Z"
    command: "npm ci"
    cwd: ".worktrees/verify-gui-133-f0815bfdbb19de427488b5179127bbd454b17350"
    exit_code: 0
    result: PASS
    summary: "Installed 647 packages from the lockfile. npm audit reported 13 existing dependency vulnerabilities (4 low, 4 moderate, 4 high, 1 critical); verification did not mutate dependency state."
  - attempted_at: "2026-08-25T03:38:20Z"
    command: "npm run typecheck"
    cwd: ".worktrees/verify-gui-133-f0815bfdbb19de427488b5179127bbd454b17350"
    exit_code: 1
    result: FAIL
    summary: "Started in parallel before the clean checkout's core build completed; downstream workspaces could not resolve newly exported core declarations. This ordering failure is retained and corrected below using the documented core-to-server build order."
  - attempted_at: "2026-08-25T03:38:20Z"
    command: "npm test"
    cwd: ".worktrees/verify-gui-133-f0815bfdbb19de427488b5179127bbd454b17350"
    exit_code: 1
    result: FAIL
    summary: "Started before @kanmer/core build artifacts existed; 39 GUI files and 276 tests passed, while 10 suites failed package-entry resolution. Retained as an ordering failure and rerun after build."
  - attempted_at: "2026-08-25T03:39:20Z"
    command: "npm run build"
    cwd: ".worktrees/verify-gui-133-f0815bfdbb19de427488b5179127bbd454b17350"
    exit_code: 0
    result: PASS
    summary: "Built @kanmer/core and both MCP server bundles in the repository's documented order."
  - attempted_at: "2026-08-25T03:39:45Z"
    command: "npm test"
    cwd: ".worktrees/verify-gui-133-f0815bfdbb19de427488b5179127bbd454b17350"
    exit_code: 0
    result: PASS
    summary: "Passed 310 core tests, 469 GUI tests, 102 MCP HTTP/integration tests, and 111 script tests, including installer process guard and packaged launcher contracts."
  - attempted_at: "2026-08-25T03:44:10Z"
    command: "npm run typecheck"
    cwd: ".worktrees/verify-gui-133-f0815bfdbb19de427488b5179127bbd454b17350"
    exit_code: 0
    result: PASS
    summary: "All workspaces typechecked: core, MCP server, UI, and GUI node/web projects."
  - attempted_at: "2026-08-25T03:44:40Z"
    command: "npm run dist:check"
    cwd: ".worktrees/verify-gui-133-f0815bfdbb19de427488b5179127bbd454b17350"
    exit_code: 0
    result: PASS
    summary: "Built the Windows NSIS installer and blockmap from the merged SHA; updater package validation passed all 8 checks."
  - attempted_at: "2026-08-25T03:46:10Z"
    command: "Kanmer-Setup-0.3.7.exe /S while Kanmer was running"
    cwd: ".worktrees/verify-gui-133-f0815bfdbb19de427488b5179127bbd454b17350"
    exit_code: 2
    result: PASS
    summary: "Direct silent replacement was correctly refused; Kanmer.exe timestamp remained unchanged and all four live processes remained running."
  - attempted_at: "2026-08-25T03:46:30Z"
    command: "Kanmer-Setup-0.3.7.exe --updated /S"
    cwd: ".worktrees/verify-gui-133-f0815bfdbb19de427488b5179127bbd454b17350"
    exit_code: 0
    result: PASS
    summary: "Updater-mode replacement completed, stopped the old processes, retained the application, and installed the stable launcher."
  - attempted_at: "2026-08-25T03:47:00Z"
    command: "MCP SDK get_status through %LOCALAPPDATA%\Kanmer\bin\kanmer-mcp.cmd"
    cwd: ".worktrees/verify-gui-133-f0815bfdbb19de427488b5179127bbd454b17350"
    exit_code: 0
    result: PASS
    summary: "The installed external generation answered as packaged v0.3.7 from LOCALAPPDATA/Kanmer/mcp/0.3.7-31160; repository staleness reported upToDate true."
---

# Verification proof

GUI-133 is verified at the exact GitHub merge SHA `f0815bfdbb19de427488b5179127bbd454b17350`.

The merged source builds and passes the complete repository test and typecheck suites. Its Windows package satisfies all updater-package checks. A real replacement exercise proved both sides of the contract: a direct install refuses to replace a live application, while the trusted updater path completes atomically and leaves a functioning external MCP runtime behind.

The initial test and typecheck failures were caused by launching downstream validation concurrently before a clean checkout had produced `@kanmer/core` build artifacts. They are retained above, then resolved by following the repository's documented build order; no assertion was weakened or removed.

The npm audit warning is recorded as dependency-state evidence and is not a failure of GUI-133's bounded installer behavior. The independently reviewed residual race for an already-running legacy direct executable remains an accepted first-upgrade limitation; this release moves future MCP sessions onto the stable external launcher and guarded immutable generations.
