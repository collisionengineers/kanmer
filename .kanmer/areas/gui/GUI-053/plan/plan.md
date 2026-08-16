# 3.1 The pure parser

**File (new):** `apps/gui/src/shared/mcp-sessions.ts` — zero imports (the type comes from `ipc.js` as a type-only import), so a vitest file next to it needs no electron.

```ts
/** Parse the CIM JSON into the sessions an NSIS update would force-kill. */
export function parseSessions(stdout: string, installDir: string): McpSessions
```

Algorithm:
1. `JSON.parse(stdout)`; if the result is not an array, wrap it (`ConvertTo-Json` emits a bare object for a single match — this is the classic PowerShell trap and the reason this function is worth testing).
2. Keep rows whose `ExecutablePath` starts with `installDir`, compared case-insensitively after normalising `/`→`\`.
3. From each `CommandLine`, extract the `--root` argument: match `/--root\s+("([^"]*)"|(\S+))/` and take group 2 ?? group 3.
4. Return `{ count: rows.length, projects: [...new Set(roots)], unknown: false }`.
5. Any throw → `{ count: 0, projects: [], unknown: true }`.

**Test (new):** `apps/gui/src/shared/mcp-sessions.test.ts` — 7 cases:
- empty string → `unknown: true`
- `"[]"` → `{count: 0, unknown: false}`
- a single bare object (not an array) → `count: 1` *(the PowerShell single-item trap)*
- two rows, same project → `count: 2, projects.length === 1`
- a row whose `ExecutablePath` is outside `installDir` → excluded
- a quoted `--root "C:\Path With Spaces\proj"` → the full path
- malformed JSON → `unknown: true`
