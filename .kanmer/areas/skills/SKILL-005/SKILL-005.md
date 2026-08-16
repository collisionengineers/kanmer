---
id: SKILL-005
type: ticket
title: 6.5 AGENTS block rewrite
status: backlog
area: skills
priority: medium
assignee: ''
labels:
  - v3-phase-6
links: []
docs_todo: true
archived: false
created: '2026-08-16T00:31:38.813Z'
updated: '2026-08-16T00:31:38.813Z'
---

Orientation essentials only: profiles exist; call `get_doc_gates` before any move; read the whole ticket folder and group context; six stages; where the docs live.

**Where:** `scripts/agents-block.mjs` (`BLOCK_BODY`), `plugins/kanmer/skills/kanmer-setup/SKILL.md`, `scripts/verify-agents-block.mjs`
**Plan:** `docs/plans/kanmer-v3/phase-6-skills-setup/plan.md` § 6.5
**Governing docs:** FRD-012 R3, ADR-0009 layer 3
**Depends:** 6.1

**Gotcha:** `BLOCK_BODY` is a literal in `agents-block.mjs` that is duplicated by hand into kanmer-setup's SKILL.md, and `verify-agents-block.mjs:146-154` asserts the two stay byte-identical. Change both or the check fails.
