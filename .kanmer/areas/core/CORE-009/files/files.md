# Where the change lands

| Path | Why |
|---|---|
| `packages/core/src/prompts.ts` | `DISPATCH_TASKS` (six tasks), `dispatchTaskById`, a shared `COMMON` preamble; `takeTicketPromptText` rewritten off the fixed pipeline. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `packages/mcp-server/src/index.ts` (the `take-ticket` prompt) | One of the two consumers — the reason this lives in core at all. |
| `apps/gui/src/main/dispatch.ts` | The other consumer. Phase 5's task picker reads `DISPATCH_TASKS` from here. |
| `docs/functional/frd/FRD-010-task-scoped-dispatch.md` R1/R2 | The six tasks and the prompt contract. |
