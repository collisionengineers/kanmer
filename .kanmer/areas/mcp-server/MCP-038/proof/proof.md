# Proof — MCP-038

## Verified merge

- Main HEAD: ed8d390541a9564cdbdda609f493c953b27ed0c8.
- PR #111 merged the corrected artifact at ed8d390541a9564cdbdda609f493c953b27ed0c8.

## Passed evidence

- npm run build — PASS.
- npm run plugin:check — PASS: 30 tools, 12 frontmatters, v0.3.3 manifests, isolated handshake.
- Fresh canonical standalone artifact SHA-256 and committed main artifact both equal 48583b7eb295dc599822dc65778a4adda9181755323824ef984f74aa4d309f6e.
- git diff --check — PASS.
- The merged PR diff is artifact-only: plugins/kanmer/mcp/kanmer-mcp.cjs.

## Review disposition

The first artifact candidate was rejected because linked-worktree dependency resolution produced non-authoritative bytes. It was rebased onto cb35e7f, regenerated from normal main, independently re-reviewed PASS, and merged.
