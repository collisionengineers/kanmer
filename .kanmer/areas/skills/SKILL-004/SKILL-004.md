---
id: SKILL-004
type: ticket
title: 6.4 Setup reconciliation
status: review
area: skills
order: 170
assignee: skill004-take
profile: feature
stageEntered:
  preparing: '2026-08-16T05:16:33.812Z'
  review: '2026-08-16T05:20:05.958Z'
  verifying: '2026-08-16T05:20:52.018Z'
  done: '2026-08-16T05:20:52.296Z'
  implementing: '2026-08-21T08:55:14.872Z'
taken_at: '2026-08-22T00:25:16.222Z'
branch: skill-004-setup-reconciliation
worktree: .worktrees/skill-004
labels:
  - v3-phase-6
groups:
  - EPIC-007
  - HZN-007
links: []
refs:
  - docs/functional/frd/FRD-013-setup-as-reconciliation.md
  - docs/architecture/adr/ADR-0010-setup-is-reconciliation.md
commits:
  - ad12740
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/17'
archived: false
created: '2026-08-16T00:31:38.802Z'
updated: '2026-08-22T00:30:47.455Z'
---

The reconcile loop — AGENTS block, version steps, ingest. GitHub issue ingestion with a list-then-confirm close flow and idempotent source links; per-item plan mining with the preview (N docs -> M items -> K tickets), area seeding and custom-empty profiles; commit-history fallback; greenfield interview retained; stage-proposal prose removed.

**Where:** `plugins/kanmer/skills/kanmer-setup/SKILL.md`
**Plan:** `docs/plans/kanmer-v3/phase-6-skills-setup/plan.md` § 6.4
**Governing docs:** FRD-013, ADR-0010
**Depends:** 6.1

Closing GitHub issues is a destructive external action — list exactly what will be closed, confirm, then act. Never silent. Idempotency is mandatory, not optional.
