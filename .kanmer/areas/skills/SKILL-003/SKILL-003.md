---
id: SKILL-003
type: ticket
title: 6.3 kanmer-docs decision table
status: done
area: skills
order: 160
assignee: gui017-executor
profile: feature
stageEntered:
  preparing: '2026-08-16T05:27:15.097Z'
  review: '2026-08-16T05:31:09.358Z'
  verifying: '2026-08-16T05:31:50.818Z'
  done: '2026-08-16T05:31:51.073Z'
  implementing: '2026-08-21T08:55:14.250Z'
labels:
  - v3-phase-6
groups:
  - EPIC-007
  - HZN-007
links: []
refs:
  - docs/functional/frd/FRD-014-doc-type-guidance.md
commits:
  - aacd09ff86f58cfe910b9e2182b37b03a3bd604f
  - d7e107b9f27a64851935310e8768fbc2c249fb75
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/19'
  - 'https://github.com/collisionengineers/kanmer/pull/140'
archived: false
created: '2026-08-16T00:31:38.792Z'
updated: '2026-08-21T23:23:46.582Z'
---

Add the PRD/FRD/ADR decision table and the granularity test to the kanmer-docs skill; retain doc-structure mirror regeneration.

**Where:** `plugins/kanmer/skills/kanmer-docs/`
**Plan:** `docs/plans/kanmer-v3/phase-6-skills-setup/plan.md` § 6.3
**Governing docs:** FRD-014 R2/R4
**Depends:** 6.1

The table and test are already written up in `docs/README.md` (Phase 0.1) — keep the two consistent, or better, have the skill point at the doc.
