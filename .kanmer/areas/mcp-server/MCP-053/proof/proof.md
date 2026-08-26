---
kind: proof-record
merged_sha: "7b3d7e1ffab10ba0f518fbd3e16fe7d1c92a8759"
environment: "Windows detached worktree; Node v24.15.0; locked npm dependencies"
verified_at: "2026-08-26T15:10:41.810Z"
result: PASS
attempts:
  - attempted_at: "2026-08-26T14:56:55.000Z"
    command: "git worktree add --detach .worktrees/verify-mcp-053-7b3d7e1ffab10ba0f518fbd3e16fe7d1c92a8759 7b3d7e1ffab10ba0f518fbd3e16fe7d1c92a8759; initial detached-state assertion"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 3
    result: INCONCLUSIVE
    summary: "The worktree was at the exact SHA and detached, but the helper assumed a different Git status label and stopped before tests."
  - attempted_at: "2026-08-26T14:57:00.000Z"
    command: "detached worktree assertion using symbolic-ref and porcelain status"
    cwd: ".worktrees/verify-mcp-053-7b3d7e1ffab10ba0f518fbd3e16fe7d1c92a8759"
    exit_code: 3
    result: INCONCLUSIVE
    summary: "The exact SHA, detached state, and empty porcelain status were observed; PowerShell treated an absent symbolic-ref as null rather than an empty string."
  - attempted_at: "2026-08-26T14:57:16.000Z"
    command: "npm run verify"
    cwd: ".worktrees/verify-mcp-053-7b3d7e1ffab10ba0f518fbd3e16fe7d1c92a8759"
    exit_code: 1
    result: FAIL
    summary: "Build, core (311), GUI (483), HTTP (107), scripts (120), typechecks, docs, smoke (241/241) passed before MCPB validation failed because this fresh worktree had no installed @anthropic-ai/mcpb CLI."
  - attempted_at: "2026-08-26T15:03:41.799Z"
    command: "npm ci --ignore-scripts"
    cwd: ".worktrees/verify-mcp-053-7b3d7e1ffab10ba0f518fbd3e16fe7d1c92a8759"
    exit_code: 0
    result: PASS
    summary: "Installed the exact lockfile dependencies in the disposable verification worktree; no repository-tracked files changed."
  - attempted_at: "2026-08-26T15:04:10.000Z"
    command: "npm run verify"
    cwd: ".worktrees/verify-mcp-053-7b3d7e1ffab10ba0f518fbd3e16fe7d1c92a8759"
    exit_code: 0
    result: PASS
    summary: "Full suite passed at the exact merge SHA: core 311, GUI 483, HTTP 107, scripts 120, MCP smoke 241/241, protocol 46/46, discovery, MCPB, typechecks, docs, skills, AGENTS block, and plugin synchronization."
---

## Outcome

PR [#282](https://github.com/collisionengineers/kanmer/pull/282) merged at 7b3d7e1ffab10ba0f518fbd3e16fe7d1c92a8759. The initial full-suite failure was an unprovisioned detached-worktree dependency state, not a source failure; after a locked clean install, the same complete verification command passed. The worktree was clean, detached, and remained at the exact merge SHA.
