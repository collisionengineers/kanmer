# Where the change lands

| Path | Change |
|---|---|
| `renderer/src/components/BacklogTable.tsx` | **New** — the windowed table. |
| `renderer/src/lib/windowedRows.ts` | **New** — the pure windowing maths, so vitest reaches it. |
| `renderer/src/lib/windowedRows.test.ts` | **New**. |
| `renderer/src/App.tsx` | A `backlog` view; the board no longer renders the Backlog column. |
| `renderer/src/components/Board.tsx` | Drop `backlog` from its columns. |
| `renderer/src/styles.css` | Table, sticky header, selection. |
| `packages/ui/src/index.ts` | Barrel export (standing obligation). |

## Context files

| Path | What it tells the implementer |
|---|---|
| `shared/stages.ts` | `UI_STAGES` is the fixed six; the board filters `backlog` out rather than the constant changing. |
| `App.tsx` filter predicate | Filters already narrow every view — "shared filters" needs no new plumbing. |
| `lib/board.ts` `columnCards` | How the board orders a column, and why a list sort must not write `order`. |
| `AGENTS.md` §8 gotcha 5 | Why a virtualization dependency is awkward: only `electron-updater` is packed from `node_modules`. |
| `packages/core/src/gates.ts` `blockedBy` | The per-ticket reasons a bulk move reports back. |
