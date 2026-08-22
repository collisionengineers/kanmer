---
id: SKILL-007
type: ticket
title: 7.3 Convert phase labels to epic groups
status: done
area: skills
order: 190
assignee: codex-recovery
profile: feature
stageEntered:
  preparing: '2026-08-16T05:32:40.747Z'
  review: '2026-08-16T05:37:06.725Z'
  verifying: '2026-08-16T05:37:51.666Z'
  done: '2026-08-16T05:37:51.947Z'
  implementing: '2026-08-21T08:55:16.141Z'
taken_at: '2026-08-22T00:40:54.999Z'
branch: skill-007-phase-groups
worktree: .worktrees/skill-007
labels:
  - v3-phase-7
groups:
  - HZN-002
  - EPIC-008
  - HZN-007
links: []
refs:
  - docs/functional/frd/FRD-001-groups.md
commits:
  - 73e2e9c
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/20'
archived: false
created: '2026-08-16T00:31:38.845Z'
updated: '2026-08-22T00:48:50.423Z'
---

kanmer-groom's conversion turns the `v3-phase-N` labels seeded in 0.3 into `epic`-kind groups, one per phase, each with a `context.md` pointing at its plan and FRDs. Seed `NOW`/`NEXT` horizon groups from what is actually in flight. Preview-first, idempotent.

**Plan:** `docs/plans/kanmer-v3/phase-7-self-adoption/plan.md` § 7.3
**Governing docs:** FRD-001 G7
**Depends:** Phase 6, 7.1

The labels already exist on all 38 seeded tickets — this is the conversion's first real input.

Verification: every `v3-phase-N` label has a corresponding epic with correct derived progress; the `NOW` filter matches reality.


## Outcome

The label-to-group conversion shipped in PR [#20](https://github.com/collisionengineers/kanmer/pull/20), merged 2026-08-16 at `f7a0ca61873398a1ff9e5a93e481acec9374367e`. Current merged-main verification confirms active direct label counts equal derived epic progress for all eight phases. HZN-001/HZN-002 remain intentionally static lenses and can drift as tickets close. Visual group rendering remains INCONCLUSIVE; no follow-up code defect was identified.
