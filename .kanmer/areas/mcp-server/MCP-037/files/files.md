# MCP-037 file map

- `packages/mcp-server/src/http.ts` — `KanmerHttpHost.start()` and `rollbackStart()`; the fingerprint await currently sits outside rollback handling.
- `packages/mcp-server/src/http.test.mjs` — child-process no-board startup regression; extend it to assert constructor resources are cleaned after fingerprint rejection.
- `packages/mcp-server/dist/http.js` — generated test target, rebuilt by the package build.
- `plugins/kanmer/mcp/kanmer-mcp.cjs` — generated standalone artifact; do not change unless the normal build/plugin flow requires it.
- `docs/functional/frd/FRD-025-remote-access.md` and `docs/architecture/adr/ADR-0017-streamable-http-remote-access.md` — governing lifecycle contract.
