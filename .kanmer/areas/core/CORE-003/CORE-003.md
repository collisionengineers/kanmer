---
id: CORE-003
type: ticket
title: 2.2 Profiles engine
status: done
area: core
order: 40
assignee: ''
profile: feature
labels:
  - v3-phase-2
groups:
  - EPIC-003
links: []
blocks:
  - CORE-005
  - CORE-007
  - GUI-007
  - GUI-009
refs:
  - docs/functional/frd/FRD-002-requirement-profiles.md
  - docs/architecture/adr/ADR-0003-requirement-profiles.md
archived: false
created: '2026-08-16T00:30:18.648Z'
updated: '2026-08-21T13:02:16.736Z'
---

Board `profiles` + area `defaultProfile`; item `profile` + `requires`. Shipped defaults table (feature/fix/chore/spike). Resolution chain P6: explicit ticket profile → area default → board default. Multi-jump blocked by the first unmet boundary. Named-file requirements for custom. One core `getDocGates(id)` returning requirements/satisfied/warnings — the single function MCP, GUI and skills all consume.

**Where:** `types.ts`, `board.ts`, `store.ts`
**Plan:** `docs/plans/kanmer-v3/phase-2-core-format3/plan.md` § 2.2
**Governing docs:** FRD-002, ADR-0003
**Depends:** 2.1

**Large reuse available:** the gate engine already exists and already has the right semantics. `evaluateGates` (docs.ts:139-166) computes leave/enter thresholds such that a multi-stage jump cannot skip a gate — FRD-002 G2 for free. `resolveDocTypes`/`resolveGates` (docs.ts:55-68) are the existing pure resolution chain; profiles slot in as a new link. Keep the engine, change where the rules come from.
