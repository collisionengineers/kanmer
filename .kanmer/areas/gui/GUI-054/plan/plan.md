# 3.2 The shell

**File (new):** `apps/gui/src/main/mcp-sessions.ts`

```ts
export async function mcpSessions(): Promise<McpSessions>      // execFile, for the renderer's Restart-now probe
export function  mcpSessionsSync(): McpSessions                // execFileSync, for before-quit only
```

Both:
- Return `{ count: 0, projects: [], unknown: false }` immediately when `process.platform !== "win32" || !app.isPackaged`. (Un-packaged means `process.execPath` is the dev Electron binary — nothing an installer would kill.)
- `installDir = dirname(process.execPath)`.
- Spawn `powershell.exe` with `["-NoProfile","-NonInteractive","-Command", <the CIM query in §Risk 1>]`, `{ timeout: 4000, windowsHide: true, maxBuffer: 1 << 20 }`.
- Pass stdout to `parseSessions(stdout, installDir)`; any throw → `{ count: 0, projects: [], unknown: true }`.

A file-header comment must record *why* this exists — quote `allowOnlyOneInstallerInstance.nsh:79-101`'s path-prefix kill and `connect.ts:47`'s `command = process.execPath`. This is non-obvious code and the next reader will otherwise delete it.

**Verify:** `npm test` (the 7 new cases pass). Manual, from an installed build with an agent connected:
```powershell
Get-CimInstance Win32_Process | ? { $_.CommandLine -like '*kanmer-mcp.cjs*' } | Select ProcessId,ExecutablePath,CommandLine
```
must list the agent's server, and Phase 7 step 8 confirms the app reports the same count.

---
