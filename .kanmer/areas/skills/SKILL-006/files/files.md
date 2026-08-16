# Where the change lands

| Path | Change |
|---|---|
| The board | 60 done tickets across core (8), mcp-server (3), gui (46), skills (3). |

No repository file changes. The procedure was written in [[SKILL-004]]; this
ticket is its first real execution, and the artifact is board data.

## Context files

| Path | What it tells the implementer |
|---|---|
| `docs/plans/kanmer-v2/phase-*/plan.md` | The `## Items` / `### N.M` structure the miner keys on. |
| `docs/plans/updater/plan.md` | The same item shape nested under `## Phase N` — why matching the container is wrong. |
| `packages/core/src/store.ts` `createItem` | Ungated creation; the reason a ticket can be born in Done. |
| `docs/architecture/adr/ADR-0010-setup-is-reconciliation.md` | Per-item mining, `custom` + empty requires, the `Source:` marker. |
