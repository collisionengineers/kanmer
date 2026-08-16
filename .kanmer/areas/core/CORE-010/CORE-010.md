---
id: CORE-010
type: ticket
title: 7.1 Migrate this board to format 3
status: done
area: core
order: 100
assignee: ''
profile: feature
labels:
  - v3-phase-7
groups:
  - EPIC-008
links: []
refs:
  - docs/functional/frd/FRD-007-fixed-six-stage-board.md
  - docs/architecture/adr/ADR-0008-single-format-3-migration.md
archived: false
created: '2026-08-16T00:31:38.823Z'
updated: '2026-08-16T23:19:35.627Z'
---

**Runs early — at the Phase-4 release, ahead of the rest of Phase 7.** The moment a release carries the format-3 migration and prompt, Kanmer's own board becomes the first real-world migration: review the dry-run, apply, keep working.

**Plan:** `docs/plans/kanmer-v3/phase-7-self-adoption/plan.md` § 7.1
**Governing docs:** FRD-007, ADR-0008
**Depends:** the Phase-4 release (4.1 in particular)

This board is standard 7-stage v2, so expect a clean 7->6 collapse with zero `needs-restage`, a priority strip, and profile assignment (active -> `feature`).

Deliberate mid-roadmap verification with real data: Phases 5 and 6 are then worked on a live format-3 board, exercising it daily before anyone else does.

Verification: the dry-run report matches the applied result; a live ticket crosses a gate the same day.
