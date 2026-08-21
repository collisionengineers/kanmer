# MCP-037 post-implementation report

## Scope delivered

MCP-037 closes the startup cleanup gap found by the independent MCP-036 review. projectFingerprint() now runs inside the same rollback boundary as listener binding. If root/board resolution rejects before bind, rollbackStart() marks the host stopping, clears the constructor-created sweep timer, destroys any tracked sockets, and closes a listener if one exists. Existing MCP-036 pre-bind ordering is preserved.

The no-board child-process regression now calls close() twice after the failed start and asserts JSON evidence that the listener is not listening and the sweep timer is destroyed.

## Validation

All commands were run on branch mcp-037-http-start-cleanup in worktree .worktrees/mcp-037:

- npm run test:http -w @kanmer/mcp-server — PASS, 7/7.
- npm run build:server — PASS.
- node packages/mcp-server/src/smoke-http.mjs — PASS.
- node packages/mcp-server/src/smoke.mjs — PASS, 184/184.
- node packages/mcp-server/src/smoke-protocol.mjs — PASS, 42/42.
- node packages/mcp-server/src/smoke-discovery.mjs — PASS, 13/13.
- npm run typecheck — PASS, all workspaces.
- git diff --check — PASS.

## Review and integration

This is a focused remediation for reviewer finding MCP-037 and contains no bearer-auth or tunnel behavior. It must receive independent review before PR merge. The PR will target the MCP-025 transport branch so the fix is included in MCP-025's eventual merge to main; the commit remains traceable through MCP-036 and MCP-025.

## Risks / follow-ups

No known residual risk within this scope. MCP-026 bearer authentication and MCP-021 tunnel adapter remain downstream tickets.
