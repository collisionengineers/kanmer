# Where the change lands

| Path | Change |
|---|---|
| `packages/core/src/prompts.ts` | `taskFeasibility` — the pure "is this a coherent next step" rule. |
| `packages/core/src/prompts.test.ts` | **New** — the feasibility matrix. |
| `apps/gui/src/main/dispatch.ts` | Accept a task id; use its prompt; carry it on the status. |
| `apps/gui/src/shared/ipc.ts` | `task`/`deliverable` on `DispatchStatus`; `dispatchAgent` takes a task. |
| `apps/gui/src/main/index.ts`, `preload`, `lib/client.ts` | Thread the task id. |
| `apps/gui/src/renderer/src/App.tsx` | Nested Dispatch ▸ provider ▸ task menu; drawer rows. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `packages/core/src/prompts.ts:5-8` | The design statement: dispatch finishes **one** deliverable and stops. The current whole-ticket call contradicts it. |
| `packages/core/src/prompts.ts` `DISPATCH_TASKS` | The SSOT — six tasks with ids, labels, deliverables and prompts. Do not restate it in the renderer. |
| `apps/gui/src/main/dispatch.ts:71-72` | Dispatch must never pre-create a worktree; only the execute prompt does. |
| `apps/gui/src/renderer/src/components/ContextMenu.tsx` | The menu the picker hangs off, and its `MenuItem` shape. |
| `packages/core/src/gates.ts` `GateReport` | `reachable`, `blockedBy` and per-requirement `satisfied` — the inputs to feasibility. |
