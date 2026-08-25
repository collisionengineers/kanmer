# Files — GUI-138

| File | Change |
|---|---|
| `apps/gui/src/main/remoteAccess/manager.ts` | Serialize owned readiness and retain provider attempt. |
| `apps/gui/src/main/remoteAccess/manager.test.ts` | Prove restart is degraded and doctor receives attempt 2. |
| `packages/mcp-server/src/tunnels/supervisor.ts` | Emit the real bounded lifecycle attempt. |
| `packages/mcp-server/src/tunnels/supervisor.test.mjs` | Prove attempt sequence across restart. |
| `packages/mcp-server/src/remote-host.ts` | Carry attempt through RemoteHostStatus to remote-cli JSON. |
| `packages/mcp-server/src/remote-host.test.mjs` | Assert production status shape. |
