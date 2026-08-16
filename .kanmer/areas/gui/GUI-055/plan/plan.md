# 5.1 Pure logic first (this is where the automated coverage lives)

**File (new):** `apps/gui/src/renderer/src/lib/update.ts` — AGENTS §7: renderer logic that could be pure, is; `lib/` is the only renderer code with vitest coverage.

```ts
export type UpdateSurface =
  | { kind: "none" }
  | { kind: "toast";  text: string }
  | { kind: "banner"; version: string };

/** What the update state should put on screen. `dismissed` is per-session (D10). */
export function updateSurface(ev: UpdateStatusEvent | null, dismissed: boolean): UpdateSurface;

/**
 * The "Restart now" gate. Returns the sentence to confirm, or null when there is
 * nothing to lose — in which case the caller may install immediately. This is
 * the guard that MUST run before the installUpdate IPC call: quitAndInstall()
 * spawns the installer before app.quit(), so a guard placed after it is a guard
 * that never runs.
 */
export function restartWarning(dirtyId: string | null, sessions: McpSessions): string | null;
```

`restartWarning` composes at most two clauses, joined with `" and "`:
- `dirtyId` → `discard unsaved changes to ${dirtyId}`
- `sessions.unknown` → `close any agent MCP sessions running from this install`
- else `sessions.count > 0` → `close ${count} agent MCP session(s) (${projects.join(", ")})`

and wraps as `Restarting to update will ${clauses}. Continue?`. Returns `null` when both are empty.

`updateSurface` mapping:

| state | `source` | result |
|---|---|---|
| `idle` / `checking` / `disabled` | any | `none` |
| `available` / `downloading` | any | `toast: "Kanmer <v> is downloading…"` |
| `downloaded`, `dismissed === false` | any | `banner: <v>` |
| `downloaded`, `dismissed === true` | any | `none` |
| `none` | `manual` | `toast: "Kanmer <v> is up to date."` |
| `none` | `auto` | `none` |
| `error` | `manual` | `toast: "Update check failed: <message>"` |
| `error` | `auto` | `none` — *a laptop that just went offline is not news* |

**Test (new):** `apps/gui/src/renderer/src/lib/update.test.ts` — one case per table row (8) plus 4 for `restartWarning` (null when clean; names the item; names the count and projects; names both; and `unknown` → the generic clause). ~13 cases.
