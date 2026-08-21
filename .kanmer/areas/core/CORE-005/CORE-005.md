---
id: CORE-005
type: ticket
title: 2.4 Typed proof
status: done
area: core
order: 60
assignee: ''
profile: feature
labels:
  - v3-phase-2
groups:
  - EPIC-003
links: []
blocks:
  - CORE-007
  - GUI-007
refs:
  - docs/functional/frd/FRD-006-typed-proof.md
  - docs/architecture/adr/ADR-0005-proof-not-deployment.md
archived: false
created: '2026-08-16T00:30:18.673Z'
updated: '2026-08-21T13:02:16.746Z'
---

Board `proofTypes` with shipped defaults (visual, test-output, command-log), reusing deployment env ids for `@<env>`. Requirement parser for `proof`, `proof:visual`, `proof:visual@staging`. Soft-warning computation inside `getDocGates` — visual with no images under `proof/` warns, never blocks.

**Where:** `packages/core/src/types.ts`, `board.ts`, the gate resolver
**Plan:** `docs/plans/kanmer-v3/phase-2-core-format3/plan.md` § 2.4
**Governing docs:** FRD-006, ADR-0005
**Depends:** 2.2, 2.3

`@env` validated against declared environments; `proof:visual@staging` on a board without a `staging` env is rejected at validation time, not at move time.
