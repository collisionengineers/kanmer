---
id: SKILL-004
type: ticket
title: 6.4 Setup reconciliation
status: backlog
area: skills
priority: medium
assignee: ''
labels:
  - v3-phase-6
links: []
docs_todo: true
archived: false
created: '2026-08-16T00:31:38.802Z'
updated: '2026-08-16T00:31:38.802Z'
---

The reconcile loop — AGENTS block, version steps, ingest. GitHub issue ingestion with a list-then-confirm close flow and idempotent source links; per-item plan mining with the preview (N docs -> M items -> K tickets), area seeding and custom-empty profiles; commit-history fallback; greenfield interview retained; stage-proposal prose removed.

**Where:** `plugins/kanmer/skills/kanmer-setup/SKILL.md`
**Plan:** `docs/plans/kanmer-v3/phase-6-skills-setup/plan.md` § 6.4
**Governing docs:** FRD-013, ADR-0010
**Depends:** 6.1

Closing GitHub issues is a destructive external action — list exactly what will be closed, confirm, then act. Never silent. Idempotency is mandatory, not optional.
