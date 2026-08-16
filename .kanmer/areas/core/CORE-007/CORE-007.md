---
id: CORE-007
type: ticket
title: 2.6 The format-3 migration
status: backlog
area: core
priority: medium
assignee: ''
labels:
  - v3-phase-2
links: []
blocks:
  - CORE-008
  - GUI-005
refs:
  - docs/functional/frd/FRD-007-fixed-six-stage-board.md
  - docs/architecture/adr/ADR-0008-single-format-3-migration.md
  - docs/functional/frd/FRD-002-requirement-profiles.md
archived: false
created: '2026-08-16T00:30:18.696Z'
updated: '2026-08-16T02:24:35.577Z'
---

v->3 in one pass: status alias table (case-insensitive, 7 stages collapse to 6), `needs-restage` fallback with a report list, doc folder moves byte-preserved, priority strip with count, profile assignment (**active -> `feature`**, done/archived -> `custom` empty) with report, board.yml rewrite. Dry-run parity, idempotent, resumable, blockers surfaced. Shared core fn used by both MCP and GUI.

**Where:** `packages/core/src/migrate.ts`, `version.ts`
**Plan:** `docs/plans/kanmer-v3/phase-2-core-format3/plan.md` § 2.6
**Governing docs:** FRD-007 M1-M4, ADR-0008, FRD-002 (profile default)
**Depends:** 2.1-2.5

**Strong precedent to carry forward:** `migrateToV2` (migrate.ts:66-382) already does dry-run, collision pre-check with blockers, per-file check-before-act resumability (deliberately, for Windows EPERM/EBUSY), and counter re-keying. `CANONICAL_STAGES` (migrate.ts:391-407) already holds a per-stage alias table. `migrateBoard` (:459) is the umbrella — format 3 becomes a third step under it.

Note the profile default is `feature` for active tickets, overriding FRD-002's original proposal of `fix`.

Fixture available: `sandbox-harness/.kanmer` is a real format-2 board carrying a stage `todo` that is not on the default board — it exercises the alias table for free.
