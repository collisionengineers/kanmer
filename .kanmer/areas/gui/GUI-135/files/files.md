# Files — GUI-135

## Change surface

| Path | Reason |
|---|---|
| apps/gui/src/main/remoteAccess/secrets.ts | Use platform-valid safeStorage capability checks and retain injected backend tests. |
| apps/gui/src/main/remoteAccess/secrets.test.ts | Prove Windows/macOS do not call the Linux-only backend selector; prove Linux basic_text/unknown remain fail-closed. |

## Context files

| Path | Contract |
|---|---|
| apps/gui/src/main/remoteAccess/manager.ts | Production caller persists generated bearers only through putSecret. |
| docs/functional/frd/FRD-025-remote-access.md | Requires protected OS storage and forbids plaintext fallback. |
| Electron safeStorage official API | getSelectedStorageBackend is Linux-only; isEncryptionAvailable is cross-platform. |

## Out of scope

No storage schema, token format, provider, tunnel, IPC, dependency, or plaintext fallback changes.
