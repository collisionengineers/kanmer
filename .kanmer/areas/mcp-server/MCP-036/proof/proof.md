# Proof — MCP-036

## Verified merge

- Main HEAD: ed8d390541a9564cdbdda609f493c953b27ed0c8.
- The project-before-bind implementation and MCP-037 cleanup are carried by PR #107 merge 4d65d91bf0b915e8a485671f4eaa06204dfea5f.
- PR #108 was closed as superseded by PR #109; its implementation remains traceable in the merged transport.

## Passed evidence on merged main

- npm run test:http -w @kanmer/mcp-server — PASS, 7/7, including no-board failure before bind and destroyed-timer regression.
- node packages/mcp-server/src/smoke-http.mjs — PASS.
- node packages/mcp-server/src/smoke.mjs — PASS, 184/184.
- node packages/mcp-server/src/smoke-protocol.mjs — PASS, 42/42.
- node packages/mcp-server/src/smoke-discovery.mjs — PASS, 13/13.
- npm run build — PASS.
- npm run typecheck — PASS.
- npm run plugin:check — PASS.
- npm test — PASS; root suite green.
- git diff --check — PASS.

## Result

Project fingerprint/root resolution occurs before listener binding; any pre-bind failure rolls back the sweep timer and tracked resources, and readiness uses the validated fingerprint.
