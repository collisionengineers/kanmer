---
kind: proof-record
merged_sha: "75cc4a89"
environment: "normal main checkout / Node v24.15.0 / Windows"
verified_at: "2026-08-21T21:52:00.000Z"
result: PASS
attempts:
  - attempted_at: "2026-08-21T21:36:00.000Z"
    command: "npm run typecheck; npm run plugin:check; npm run smoke:protocol"
    cwd: "."
    exit_code: 1
    result: FAIL
    summary: "Concurrent checks raced the merged-main build: stale core declarations made typecheck fail and stale 30-tool artifacts made plugin/protocol checks fail."
  - attempted_at: "2026-08-21T21:44:00.000Z"
    command: "npm run typecheck"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "All workspaces typechecked against the completed merged-main build."
  - attempted_at: "2026-08-21T21:45:00.000Z"
    command: "npm run plugin:check"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "31 tools match; bundle bytes match; skill frontmatters/manifests and isolated handshake pass."
  - attempted_at: "2026-08-21T21:46:00.000Z"
    command: "node packages/mcp-server/src/smoke.mjs"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "214/214 MCP smoke checks passed, including get_execution_packet."
  - attempted_at: "2026-08-21T21:47:00.000Z"
    command: "npm run smoke:protocol"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "42/42 protocol checks passed across supported protocol versions."
  - attempted_at: "2026-08-21T21:48:00.000Z"
    command: "npm run smoke:discovery"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "13/13 discovery and --init checks passed."
  - attempted_at: "2026-08-21T21:49:00.000Z"
    command: "npm test -w @kanmer/core -- --testTimeout=30000"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "259/259 core tests passed."
---
Independent merged-main proof: PR #135 merged as 75cc4a89 (source commit 2cdd0c68). Independent review found no blocking findings. The read-only get_execution_packet production tool, shared document-version inventory, refusal precedence, documentation, generated plugin bundle, and smoke coverage are all present and reachable.
