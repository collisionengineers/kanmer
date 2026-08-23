---
id: SKILL-032
type: ticket
title: Remove stale legacy review-asset prose from the review skill
status: implementing
area: skills
assignee: codex-recovery
profile: fix
stageEntered:
  preparing: '2026-08-23T01:45:46.982Z'
taken_at: '2026-08-23T01:47:00.010Z'
branch: skill-032-remove-stale-review-prose
worktree: .worktrees/skill-032
labels:
  - remediation
  - skills
  - documentation
groups:
  - HZN-007
links:
  - SKILL-009
refs:
  - docs/architecture/adr/ADR-0009-skills-are-not-the-contract.md
  - docs/functional/frd/FRD-014-doc-type-guidance.md
docs_todo: true
archived: false
created: '2026-08-23T01:44:25.447Z'
updated: '2026-08-23T01:47:00.010Z'
---

The historical SKILL-009 audit found `plugins/kanmer/skills/kanmer-review/SKILL.md` still says the deleted `pr-*` review assets remain untouched and SKILL-015 owns their deletion. Update the skill prose and its verification coverage to describe the current whole-file scratch/review flow and absent legacy assets. Search the bundled skill tree for the same stale claim and change only the contradictory guidance. Link [[SKILL-009]].
