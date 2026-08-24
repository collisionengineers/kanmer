# Files — GUI-129

## Where the change lands

| Path | Why |
|---|---|
| `apps/gui/src/main/settings.ts` | Contains the production `writeSettings` atomic temporary-write and rename path. Add the bounded Windows-only retry without changing the settings data contract or the in-process queue. |
| `apps/gui/src/main/settings.test.ts` | Replace the shared fixed fixture root and prove transient rename recovery plus persistent-error propagation through real settings callers. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `docs/functional/frd/FRD-019-gui-shell.md` | R7 establishes persistent desktop-shell settings as the governing behavior; no user-visible format change is in scope. |
| `apps/gui/src/main/settings.ts` | `withSettingsFileLock` already serializes all public mutations; retry belongs only at the external filesystem replacement boundary. |
| `apps/gui/src/main/remoteAccess/configStore.ts` | Uses its own async settings-envelope persistence; it is adjacent context but deliberately not modified by this ticket. |
| `apps/gui/src/main/openaiTunnel.ts` | Has a separate persisted settings file and must not be folded into this settings.json remediation. |
| `apps/gui/package.json` | Defines the focused GUI Vitest and typecheck commands; no dependency addition is authorized. |

## Ripple effects

The setting mutations used by the main process (`setTheme`, preferences, session, Git handoff, and native reconnect state) all share this production helper. Tests must preserve the existing atomic write and rejection behavior. No committed generated artifact is expected for a TypeScript/test-only source change.

## Out of scope

- `MCP-048` tunnel-readiness policy, Cloudflare resources, or remote-access adapter changes.
- Retrying arbitrary filesystem operations, read errors, JSON errors, or non-Windows errors.
- Suppressing a final rename failure, switching to direct writes, changing settings schema, or adding a dependency.
