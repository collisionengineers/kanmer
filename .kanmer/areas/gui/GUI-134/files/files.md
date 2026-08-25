# Files — GUI-134

## Change surface

| Path | Reason and risk |
|---|---|
| apps/gui/src/shared/ipc.ts | Extend the typed public bridge so secret creation carries the caller-observed config generation. Contract drift here can leave renderer and main disagreeing. |
| apps/gui/src/preload/index.ts | Forward the generation as a third IPC argument. This is the missing production boundary reproduced in installed v0.3.7. |
| apps/gui/src/renderer/src/components/Settings.tsx | Pass the current view status generation from the Create/Rotate token actions. Preserve the existing optimistic-concurrency behavior. |
| apps/gui/src/preload/index.test.ts and/or the existing Settings remote test | Prove the bridge and production caller forward the exact generation; do not replace manager concurrency tests. |

## Context files

| Path | What it establishes |
|---|---|
| apps/gui/src/main/index.ts | The main handler already validates and forwards expectedConfigGeneration; no main-process redesign is needed. |
| apps/gui/src/main/remoteAccess/manager.ts | createSecret deliberately rejects stale/null generations after config save. Preserve this protection. |
| apps/gui/src/main/remoteAccess/manager.test.ts | Manager behavior is already covered; the missing coverage is above it. |
| docs/functional/frd/FRD-025-remote-access.md | Token creation must use protected storage and safe per-project lifecycle controls. |

## Ripple effects

The same bridge serves token creation and rotation. Both callers must pass the latest config generation. No schema, persisted data, Cloudflare resource, auth policy, or dependency changes are required.

## Out of scope

Do not bypass version checks, hand-edit encrypted secret files, change provider configuration, alter tunnel resources, or add a second token path.
