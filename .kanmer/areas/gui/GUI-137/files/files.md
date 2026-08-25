# Files — GUI-137

## Change scope

| File | Change |
|---|---|
| `apps/gui/src/main/remoteAccess/manager.ts` | Canonicalize project ids for records, queues, registrations, deliveries, status correlation, removal, and runtime actions. |
| `apps/gui/src/main/remoteAccess/manager.test.ts` | Prove Windows display and canonical path spellings share one auto-start/runtime record. |

## Context

- `apps/gui/src/main/remoteAccess/identity.ts`: existing canonical path helper.
- `apps/gui/src/main/remoteAccess/configStore.ts`: persistence already canonicalizes.
- FRD-025: one owned runtime per canonical project.

## Out of scope

No provider, DNS, secret format, endpoint protocol, updater, or OpenAI runtime changes.

## Approved ripple correction

| `apps/gui/src/renderer/src/components/Settings.tsx` | Correlate selected/overview remote status by stable project fingerprint rather than display-path equality. |
| `apps/gui/src/renderer/src/components/Settings.remote.test.tsx` | Prove a canonical status event updates a selected project opened with a Windows display path. |
