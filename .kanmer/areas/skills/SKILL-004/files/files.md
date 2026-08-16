# Where the change lands

| Path | Why |
|---|---|
| `plugins/kanmer/skills/kanmer-setup/SKILL.md` | The whole skill: three modes → one reconcile loop, plus ingest. |

Single-file, but a rewrite rather than an edit — the mode table is the
structure, and it is the thing being replaced.

## Context files

| Path | What it tells the implementer |
|---|---|
| `docs/architecture/adr/ADR-0010-setup-is-reconciliation.md` | The decision: four reconcile steps, per-**item** plan mining, `custom` + empty requires for historical tickets, list-then-confirm on issue closing. |
| `packages/core/src/store.ts` `createItem` | Creation is ungated — historical tickets can be born in Done without crossing a gate. Confirms CORE-011 does not affect backfill. |
| `packages/core/src/store.ts` `assertRefs` | `refs` must be repo-relative paths that exist, so a GitHub URL cannot live there. The idempotency marker has to go in the body. |
| `scripts/agents-block.mjs` | Already idempotent between markers; setup calls it rather than hand-writing. |
| `packages/core/src/migrate.ts` `migrateBoard` | Safe to call unconditionally now that CORE-012 made a second run a no-op. |
| `plugins/kanmer/skills/kanmer-tickets/SKILL.md` | Where an already-set-up board is handed off to. |
