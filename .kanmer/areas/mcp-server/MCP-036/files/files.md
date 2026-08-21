# Files — MCP-036

## Modify

- `packages/mcp-server/src/http.ts`: resolve/capture project identity before `listen()`; roll back startup resources on failure.
- `packages/mcp-server/src/http.test.mjs`: add no-board/fingerprint-failure regression and preserve valid-start assertions.

## Inspect

- `packages/mcp-server/src/index.ts`: canonical `projectFingerprint()` and root resolution.
- `packages/mcp-server/src/http.ts`: listener, timer, socket, and readiness lifecycle.
- `docs/functional/frd/FRD-025-remote-access.md`, `docs/architecture/adr/ADR-0017-streamable-http-remote-access.md`: resolve-before-bind contract.

## Do not modify

Bearer auth, tunnel adapters, GUI storage, public binds, tool schemas, or unrelated lifecycle semantics.
