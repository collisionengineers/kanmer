---
kind: proof-record
merged_sha: "4fda54b4489fa4bc4b6b091c2af67715245ffa08"
environment: "Windows detached worktree .worktrees/verify-core-126-4fda54b4489fa4bc4b6b091c2af67715245ffa08; Node v24.15.0; npm 11.14.1"
verified_at: "2026-08-31T17:31:39.7768407Z"
result: PASS
attempts:
  - attempted_at: "2026-08-31T17:21:49.1939047Z"
    command: "npm ci"
    cwd: ".worktrees/verify-core-126-4fda54b4489fa4bc4b6b091c2af67715245ffa08"
    exit_code: 0
    result: PASS
    summary: "Installed exact lockfile dependencies in detached verification worktree."
  - attempted_at: "2026-08-31T17:22:16.5555888Z"
    command: "npm run verify"
    cwd: ".worktrees/verify-core-126-4fda54b4489fa4bc4b6b091c2af67715245ffa08"
    exit_code: 0
    result: PASS
    summary: "720 core, 524 GUI, 172 MCP/integration, 160 scripts, 371 smoke, and 50 protocol checks passed; builds, typechecks, docs, MCPB, skills, AGENTS, and plugin-byte identity also passed."
---

# Verification

PASS at the exact GitHub merge SHA in a clean detached Windows worktree.

The protected batch merge path is present at the merged target, and the complete authoritative verification rail passed without retries or source changes.
