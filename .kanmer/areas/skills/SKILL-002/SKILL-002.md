---
id: SKILL-002
type: ticket
title: 6.2 Templates
status: implementing
area: skills
order: 150
assignee: claude-code
profile: feature
stageEntered:
  preparing: '2026-08-16T05:22:40.072Z'
  review: '2026-08-16T05:25:46.730Z'
  verifying: '2026-08-16T05:26:22.711Z'
  done: '2026-08-16T05:26:22.963Z'
  implementing: '2026-08-21T08:55:13.619Z'
labels:
  - v3-phase-6
groups:
  - EPIC-007
  - HZN-007
links: []
refs:
  - docs/functional/frd/FRD-014-doc-type-guidance.md
commits:
  - 78ee829
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/18'
archived: false
created: '2026-08-16T00:31:38.780Z'
updated: '2026-08-21T12:55:47.270Z'
---

Identity first-lines on every template; the files template with two sections and the contrast rule; per-proof-type templates; group and ticket template updates for the `groups`/`profile` fields; a research summary template for deep mode.

**Where:** `plugins/kanmer/skills/*/assets/`
**Plan:** `docs/plans/kanmer-v3/phase-6-skills-setup/plan.md` § 6.2
**Governing docs:** FRD-014 R1/R3
**Depends:** 6.1

Verification is grep-able: every shipped template's first line names its type and its nearest confusion.
