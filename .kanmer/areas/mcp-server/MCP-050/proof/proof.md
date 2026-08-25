---
kind: proof-record
merged_sha: "110e88a61ece4872e8ca5acd9318e34e5c0fbfcf"
environment: "Windows detached exact-merge worktree plus clean main clone; Node v24.15.0"
verified_at: "2026-08-25T08:55:22.959Z"
result: PASS
attempts:
  - attempted_at: "2026-08-25T08:55:22.959Z"
    command: "npm ci --ignore-scripts"
    cwd: ".worktrees/verify-mcp-050-110e88a61ece4872e8ca5acd9318e34e5c0fbfcf"
    exit_code: 0
    result: PASS
    summary: "Installed the locked dependency graph in the detached exact-merge worktree."
  - attempted_at: "2026-08-25T08:55:22.959Z"
    command: "npm run verify"
    cwd: ".worktrees/verify-mcp-050-110e88a61ece4872e8ca5acd9318e34e5c0fbfcf"
    exit_code: 0
    result: PASS
    summary: "Authoritative rail passed at the exact merge SHA: core 310/310, GUI 477/477, MCP HTTP 102/102, script 111/111, smoke/protocol/docs/skills/AGENTS/MCPB/plugin checks all green."
  - attempted_at: "2026-08-25T08:55:22.959Z"
    command: "npm run release -- 0.3.8 --ticket CORE-103 --dry-run"
    cwd: ".worktrees/core-103 (clean clone, main at exact merge SHA)"
    exit_code: 0
    result: PASS
    summary: "Genuine clean-clone release verification passed without a developer board and wrote no Git or remote release state."
---

# Verification

The shipped test fixtures are hermetic at the exact GitHub merge commit. The complete verification rail and the previously failing clean-clone release dry run both pass.
