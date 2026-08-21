---
id: CORE-008
type: ticket
title: 3.1 Group entity
status: done
area: core
order: 100
assignee: ''
profile: feature
labels:
  - v3-phase-3
groups:
  - EPIC-004
links: []
blocks:
  - MCP-001
  - CORE-009
refs:
  - docs/functional/frd/FRD-001-groups.md
  - docs/architecture/adr/ADR-0001-group-membership-on-ticket.md
archived: false
created: '2026-08-16T00:30:18.723Z'
updated: '2026-08-21T13:02:16.767Z'
---

Board `groupKinds` with prefixes (defaults epic/EPIC, horizon/HZN); item `groups: []`; `groups/<ID>/` folders; group CRUD, archive, shared-doc IO reusing 2.3's path engine. Members and progress are **derived, never stored**. Membership validated against existing group ids; archived groups still render on chips as archived.

**Where:** `packages/core/src/types.ts`, `paths.ts`, `ids.ts`, `store.ts`
**Plan:** `docs/plans/kanmer-v3/phase-3-groups-mcp/plan.md` § 3.1
**Governing docs:** FRD-001 G1-G4, ADR-0001
**Depends:** Phase 2 (frozen core)

Reuse the existing per-prefix id machinery (ids.ts:108-157) for group ids.
