# Proof — MCP-027

## Merge and traceability

- PR #114 was independently reviewed and merged to `main` at `765c3f6f3ef27ea8b7d7223267b181a19a7d0de6`.
- Implemented commits reachable from the merge target: `2c30c0d1`, `12a22fab`, `0719a399`, `91a0a64b`, `0552e6f7`, `2d54db9e`, `e446f619`, `32fb2f93`.
- MCP-039 separately regenerated the committed standalone plugin artifact after this merge; PRs #115 and #116 are merged and the rejected/closed PR #117 was not used.

## Merged-main verification

All commands were run from the repository's merged `main` checkout:

- `npm run build` — PASS.
- `npm run plugin:check` — PASS: 30 tools, committed standalone bytes match a fresh canonical build, 12 skill frontmatters, manifests v0.3.3, isolated handshake lists 30 tools.
- `npm run typecheck` — PASS for core, MCP server, UI, and GUI.
- `npm test` — PASS: core 256, GUI 318, MCP/HTTP/doctor 61, scripts 66.
- `npm run smoke:doctor -w @kanmer/mcp-server` — PASS (schema-v1, 26 checks, no secret canary).
- `npm run smoke:http` — PASS.
- `npm run smoke:protocol` — PASS, 42/42.
- `npm run smoke:discovery` — PASS, 13/13.
- `git diff --check` — PASS.

The doctor exposes provider-neutral config/local/public diagnosis, bounded and cancellable checks, explicit failure and prerequisite-skip semantics, safe redaction, and no provider mutation. Real named-tunnel acceptance remains the downstream MCP-028 scope. No secrets are present in this proof.
