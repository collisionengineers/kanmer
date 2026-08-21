# Proof — MCP-025

## Verified merge

- Main checkout was fast-forwarded to origin/main at ed8d390541a9564cdbdda609f493c953b27ed0c8.
- PR #107 merged the transport at 4d65d91bf0b915e8a485671f4eaa06204dfea5f; MCP-036/MCP-037 startup remediations are included in that merge.
- MCP-038 merged the final standalone artifact at ed8d390541a9564cdbdda609f493c953b27ed0c8.

## Passed evidence on merged main

- npm test — PASS: core 256/256, GUI 318/318, MCP HTTP 7/7, scripts 66/66; manual check current.
- npm run build — PASS (core and MCP ESM/standalone).
- npm run plugin:check — PASS: 30 tools, bundle bytes match, 12 skill frontmatters, v0.3.3 manifests, isolated handshake.
- npm run typecheck — PASS across all workspaces.
- npm run test:http -w @kanmer/mcp-server — PASS, 7/7.
- node packages/mcp-server/src/smoke-http.mjs — PASS.
- node packages/mcp-server/src/smoke.mjs — PASS, 184/184.
- node packages/mcp-server/src/smoke-protocol.mjs — PASS, 42/42.
- node packages/mcp-server/src/smoke-discovery.mjs — PASS, 13/13.
- git diff --check — PASS.

## Scope and safety

HTTP remains opt-in, loopback-only, authorizer-required, bounded, per-session isolated, and safely stoppable. No bearer implementation, tunnel adapter, persistent-session behavior, or GUI exposure was added; MCP-026 and MCP-021 remain downstream.
