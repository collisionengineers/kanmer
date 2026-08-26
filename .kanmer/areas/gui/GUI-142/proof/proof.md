---
kind: proof-record
merged_sha: "6d5e68f9080aa25baaf6092ca7984cd1c1cd8a38"
environment: "Windows detached worktree .worktrees/verify-gui-142-6d5e68f9080aa25baaf6092ca7984cd1c1cd8a38 with isolated npm workspaces"
verified_at: "2026-08-26T19:00:50.203Z"
result: PASS
attempts:
  - attempted_at: "2026-08-26T19:00:50.203Z"
    command: "npm test"
    cwd: ".worktrees/verify-gui-142-6d5e68f9080aa25baaf6092ca7984cd1c1cd8a38"
    exit_code: 1
    result: FAIL
    summary: "Core passed (323 tests), but GUI failed because the clean detached worktree resolved @kanmer/core through the mutable parent checkout's node_modules workspace link; failures named newer antigravity and lock APIs that are absent from the merged SHA."
  - attempted_at: "2026-08-26T19:00:50.203Z"
    command: "npm ci --ignore-scripts --prefer-offline; npm test"
    cwd: ".worktrees/verify-gui-142-6d5e68f9080aa25baaf6092ca7984cd1c1cd8a38"
    exit_code: 1
    result: FAIL
    summary: "After isolating npm workspace links, Core again passed (323 tests); GUI correctly resolved the local workspace but failed before tests because the local @kanmer/core dist artifact had not yet been built."
  - attempted_at: "2026-08-26T19:00:50.203Z"
    command: "npm run build"
    cwd: ".worktrees/verify-gui-142-6d5e68f9080aa25baaf6092ca7984cd1c1cd8a38"
    exit_code: 0
    result: PASS
    summary: "Built Core and MCP server artifacts for the exact detached merge SHA."
  - attempted_at: "2026-08-26T19:00:50.203Z"
    command: "npm test"
    cwd: ".worktrees/verify-gui-142-6d5e68f9080aa25baaf6092ca7984cd1c1cd8a38"
    exit_code: 0
    result: PASS
    summary: "Manual check, Core 323 tests, GUI 486 tests (including portable launcher probe and normal-argv MCP handshake), MCP HTTP 107 tests, and scripts 120 tests all passed."
  - attempted_at: "2026-08-26T19:00:50.203Z"
    command: "npm run plugin:build"
    cwd: ".worktrees/verify-gui-142-6d5e68f9080aa25baaf6092ca7984cd1c1cd8a38"
    exit_code: 0
    result: PASS
    summary: "Rebuilt the plugin MCP bundle from the exact merged source."
  - attempted_at: "2026-08-26T19:00:50.203Z"
    command: "npm run plugin:check"
    cwd: ".worktrees/verify-gui-142-6d5e68f9080aa25baaf6092ca7984cd1c1cd8a38"
    exit_code: 0
    result: PASS
    summary: "37 tools, bundle bytes, 12 skill frontmatters, manifests, and isolated MCP handshake passed."
---

# GUI-142 merged-SHA verification

PR [#281](https://github.com/collisionengineers/kanmer/pull/281) merged at `2026-08-26T18:37:29Z` as exact commit `6d5e68f9080aa25baaf6092ca7984cd1c1cd8a38`.

The verification worktree was detached, clean, and at that full SHA before the checks. The first two full-suite runs exposed verification-environment setup faults, not source defects: first the parent checkout's mutable workspace package link leaked into the detached worktree; after local dependency installation, Core's generated export had not yet been built. Both non-zero attempts are retained above. After isolating dependencies and building the exact source, every recorded verification command passed.

This proves the merged GUI-142 outcome: portable Windows Connect registration reaches the launcher through normal argv serialization; launch failures surface; the MCP initialize/tools-list/get-status handshake succeeds; reconnect migration and descriptor staleness coverage pass; and the committed plugin bundle is in parity.

Residual risk remains [[CORE-112]]: manually formatted but semantically equivalent TOML can temporarily receive a false stale warning until the semantic smol-toml follow-up lands. This does not invalidate the merged generated descriptor or its acceptance checks.
