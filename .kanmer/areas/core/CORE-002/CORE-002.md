---
id: CORE-002
type: ticket
title: 2.1 Fixed stages
status: backlog
area: core
priority: medium
assignee: ''
labels:
  - v3-phase-2
links: []
blocks:
  - CORE-003
  - CORE-004
  - CORE-006
  - GUI-006
docs_todo: true
archived: false
created: '2026-08-16T00:30:18.635Z'
updated: '2026-08-16T00:32:05.246Z'
---

`statuses` leaves `BoardConfigSchema`; stage ids/names/order/colours become constants in core. Every status validation checks the constant set. The status kind leaves the column-tool surface (area only). Legacy boards stay readable pre-migration, writes refused.

**Where:** `packages/core/src/types.ts` (BoardConfig loses `statuses`), `board.ts` (constants + `defaultBoardConfig()`), `store.ts` validation paths.
**Plan:** `docs/plans/kanmer-v3/phase-2-core-format3/plan.md` § 2.1
**Governing docs:** FRD-007 B1-B3, ADR-0002
**Depends:** Phase 0

Note `assertFinalStageGates` (store.ts:1126-1150) simplifies once `done` is always last; `assertNoStrandedColumns` (store.ts:210-236) keeps working for areas.
