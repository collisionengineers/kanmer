# Open questions — GUI-144

None blocking. Decisions taken and recorded so the plan does not silently assume them:

- **Registry code reuse.** The GUI mirrors the registry file contract in `apps/gui/src/main/projectRegistry.ts` instead of importing `packages/mcp-server/src/project-registry.ts`: the server package emits no type declarations and the GUI's composite tsconfig refuses cross-package source imports; fixing that is a server-package change outside this lane. A contract test loads the server module at runtime (untyped) to prove the GUI's writes parse and validate identically. Parked below: exporting typed helpers from the server package.
- **F-001 (unlocked read-modify-write).** Resolved on the GUI side with an in-process write queue plus a stale-edit guard (re-read before the atomic rename); the GUI is the only writer.
- **Registry add flow.** Only an already-open project (a tab) can be added; its roots come from the main-process `ProjectContext`. "Add another folder" reuses the existing picker → open tab → add.
- **UI placement.** A "Projects" tab in Settings, using the Remote-access card layout; non-selected endpoints expose only "Open project".
- **Lease fields.** CORE-115 `lease_*` fields are read defensively from the item record and shown when present.

## Parked (explicitly deferred)

- [ ] Export typed registry helpers from `@kanmer/mcp-server` (tsup `dts` + `exports`) so the GUI can drop its mirror; needs a server-package ticket after CORE-115 lands.
- [ ] Per-endpoint HTTP/tunnel liveness in the registry view (MCP-054 parked item; the remote-access tab already shows it per project).
