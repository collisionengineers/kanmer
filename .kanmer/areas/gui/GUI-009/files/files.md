# Where the change lands

| Path | Why |
|---|---|
| `renderer/src/components/Editor.tsx` | The `ReadinessPanel` and its data effect. |
| `renderer/src/styles.css` | `.readiness` — tokens only. |
| `shared/ipc.ts`, `main/index.ts`, `preload/index.ts`, `renderer/src/lib/client.ts` | The new `getGates` channel carrying the whole `GateReport`. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `main/index.ts` `CH.getGateStatus` | The existing per-stage view, already rewired onto the core resolver in Phase 2. The new channel is the fuller answer, not a replacement. |
| `packages/core/src/gates.ts` `GateReport` | The shape: boundaries, per-requirement satisfaction, warnings, reachability. |
| `AGENTS.md` §7 (renderer may only `import type`) | Why this must be a channel and not a computation. |
