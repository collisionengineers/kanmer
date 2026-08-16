---
id: SKILL-006
type: ticket
title: 7.2 Backfill pre-board history
status: preparing
area: skills
assignee: ''
profile: feature
stageEntered:
  preparing: '2026-08-16T05:38:46.037Z'
labels:
  - v3-phase-7
groups:
  - HZN-002
  - EPIC-008
links: []
refs:
  - docs/functional/frd/FRD-013-setup-as-reconciliation.md
  - docs/architecture/adr/ADR-0010-setup-is-reconciliation.md
archived: false
created: '2026-08-16T00:31:38.834Z'
updated: '2026-08-16T05:38:46.037Z'
---

Run kanmer-setup reconcile on this repo: mine `docs/plans/**` (kanmer-upgrades, kanmer-v2, updater, reviews) **per item** into done tickets — plan content into `plan/`, verification sections seeding `proof/`, `custom` empty-requires profiles, areas proposed from the mining. Preview counts confirmed before creating anything. Any open GitHub issues ingested with the confirm-then-close flow. A re-run creates nothing.

**Plan:** `docs/plans/kanmer-v3/phase-7-self-adoption/plan.md` § 7.2
**Governing docs:** FRD-013 R3, ADR-0010
**Depends:** Phase 6

Creation into Done is ungated, which is what makes this possible.

Verification: audit N mined docs -> M items -> K done tickets; spot-check ten tickets file-for-file against their source plans; second run is a no-op.
