# Checklist — MCP-042

- [x] Rebuild the canonical standalone MCP bundle and refresh plugins/kanmer/mcp/kanmer-mcp.cjs with npm run plugin:build.
- [x] Confirm the artifact-only diff and git diff --check.
- [x] Run npm run plugin:check; 34 tools, bundle bytes, 12 skill frontmatters, manifests, and isolated handshake all pass.
- [x] Run npm run mcpb:check; MCPB manifest validation, pack/unpack, and plugin/fresh-standalone byte parity pass.
- [x] Run MCP smoke (224/224), smoke:protocol (46/46), @kanmer/mcp-server typecheck, and test:scripts (82/82).
- [x] Preserve the original hosted PR #142 failure (run 32545782848 / job 96963841700) as the trigger and keep GUI-075/GUI-110 behavior out of scope.

## Parked (explicitly deferred)

- Authenticated provider execution and visual screenshot evidence are not applicable to this artifact-only remediation; no provider behavior changed.
- Hosted rerun for PR #142 is owned by the dependent GUI stack after this artifact PR merges; do not fabricate a hosted result here.
