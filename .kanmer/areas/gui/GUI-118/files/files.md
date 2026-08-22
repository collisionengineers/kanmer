# GUI-118 files and impact

## In scope

- `apps/gui/src/main/index.ts`, `apps/gui/src/main/kanmerGit.ts`, provider/connect lifecycle helpers, and settings state used by branch reconciliation.
- Focused GUI tests for native branch binding, Retry reconciliation, open/Connect/rename serialization, and durable reconnect/handoff state.
- Cumulative CORE-043 review/report packet and governing wording only where required.

## Out of scope

Do not change OpenAI/remote/Claude marketplace propagation (GUI-119), core source fetching, board format, or live GitHub protection/provider state.
