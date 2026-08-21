---
id: SKILL-005
type: ticket
title: 6.5 AGENTS block rewrite
status: implementing
area: skills
order: 1110
assignee: claude-code
profile: feature
stageEntered:
  verifying: '2026-08-16T05:15:47.269Z'
  done: '2026-08-16T05:15:47.510Z'
  review: '2026-08-21T08:55:15.302Z'
  implementing: '2026-08-21T08:55:15.489Z'
labels:
  - v3-phase-6
groups:
  - EPIC-007
links: []
refs:
  - docs/functional/frd/FRD-012-connect.md
  - docs/architecture/adr/ADR-0009-skills-are-not-the-contract.md
commits:
  - 21b53a7
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/16'
archived: false
created: '2026-08-16T00:31:38.813Z'
updated: '2026-08-21T08:55:15.489Z'
---

Orientation essentials only: profiles exist; call `get_doc_gates` before any move; read the whole ticket folder and group context; six stages; where the docs live.

**Where:** `scripts/agents-block.mjs` (`BLOCK_BODY`), `plugins/kanmer/skills/kanmer-setup/SKILL.md`, `scripts/verify-agents-block.mjs`
**Plan:** `docs/plans/kanmer-v3/phase-6-skills-setup/plan.md` § 6.5
**Governing docs:** FRD-012 R3, ADR-0009 layer 3
**Depends:** 6.1

**Gotcha:** `BLOCK_BODY` is a literal in `agents-block.mjs` that is duplicated by hand into kanmer-setup's SKILL.md, and `verify-agents-block.mjs:146-154` asserts the two stay byte-identical. Change both or the check fails.
