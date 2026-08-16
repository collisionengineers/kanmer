# 2.3 Events → one channel

Add to `shared/ipc.ts` in Phase 4; the shape main emits:

```ts
export type UpdatePhase =
  | { phase: "idle" }
  | { phase: "checking" }
  | { phase: "available";   version: string }
  | { phase: "downloading"; version: string; percent: number }
  | { phase: "downloaded";  version: string; releaseNotes?: string }
  | { phase: "none";        version: string }   // up to date; version = the installed one
  | { phase: "error";       message: string }
  | { phase: "disabled" };                      // dev / smoke — the updater is not running

export interface UpdateStatusEvent { status: UpdatePhase; source: "auto" | "manual" }
```

**One channel, not two.** Research suggested `updateStatus` + `updateProgress`; fold progress into `phase: "downloading"`. Two channels would mean two `KanmerApi` methods and two preload wrappers for one concept, and would not reduce the event rate. Instead **throttle in main**: emit a `downloading` payload only when `Math.floor(percent)` changes. That is ≤100 IPC messages per download instead of thousands.

Wiring:

| electron-updater event | emitted `phase` |
|---|---|
| `checking-for-update` | `checking` |
| `update-available(info)` | `available`, `version: info.version` |
| `update-not-available` | `none`, `version: app.getVersion()` |
| `download-progress(p)` | `downloading`, `percent: p.percent` (throttled) |
| `update-downloaded(e)` | `downloaded`; `releaseNotes: typeof e.releaseNotes === "string" ? e.releaseNotes : undefined` (it is `string \| ReleaseNoteInfo[] \| null`) |
| `update-cancelled` | `idle` |
| `error(err)` | `error`, `message: err.message` |

Each emit sets a module-level `state` **and** calls `send(...)`, so `updateState()` and the push can never disagree.
