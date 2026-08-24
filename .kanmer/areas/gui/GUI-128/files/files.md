# Files — GUI-128

## Modify

| Path | Change | Guardrail |
| --- | --- | --- |
| `apps/gui/src/main/index.sync.test.ts` | Add the static `Notification.isSupported()` member to the existing Electron mock, returning `false`. | Do not alter production notification, toast, sync, Electron, or settings behavior. |

## Inspect only

| Path | Reason |
| --- | --- |
| `apps/gui/src/main/index.ts` | Confirms the static API the mock must represent. |
| `apps/gui/src/main/settings.test.ts` | Its atomic-write EPERM is unrelated and out of scope. |

## Ripple

The unhandled error blocks the GUI workspace and root verification even though sync assertions pass. GUI-128 unblocks an honest full-rail result for GUI-127.
