---
id: SKILL-007
type: ticket
title: 7.3 Convert phase labels to epic groups
status: backlog
area: skills
assignee: ''
profile: feature
labels:
  - v3-phase-7
links: []
refs:
  - docs/functional/frd/FRD-001-groups.md
archived: false
created: '2026-08-16T00:31:38.845Z'
updated: '2026-08-16T02:24:35.783Z'
---

kanmer-groom's conversion turns the `v3-phase-N` labels seeded in 0.3 into `epic`-kind groups, one per phase, each with a `context.md` pointing at its plan and FRDs. Seed `NOW`/`NEXT` horizon groups from what is actually in flight. Preview-first, idempotent.

**Plan:** `docs/plans/kanmer-v3/phase-7-self-adoption/plan.md` § 7.3
**Governing docs:** FRD-001 G7
**Depends:** Phase 6, 7.1

The labels already exist on all 38 seeded tickets — this is the conversion's first real input.

Verification: every `v3-phase-N` label has a corresponding epic with correct derived progress; the `NOW` filter matches reality.
