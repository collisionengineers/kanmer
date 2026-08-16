---
id: SKILL-001
type: ticket
title: 6.1 Roster sweep
status: backlog
area: skills
priority: medium
assignee: ''
labels:
  - v3-phase-6
links: []
blocks:
  - SKILL-002
  - SKILL-003
  - SKILL-004
  - SKILL-005
  - SKILL-006
  - SKILL-007
  - DOC-005
docs_todo: true
archived: false
created: '2026-08-16T00:31:38.765Z'
updated: '2026-08-16T00:32:25.564Z'
---

All twelve remaining skills: gate prose deleted in favour of `get_doc_gates`; six-stage and folder-path references; read-everything openings including group context; questioning prose per skill; kanmer-research rewritten for quick/deep with source classes; kanmer-auto profile-partitioned waves and files/-overlap lanes; kanmer-verify typed proof; kanmer-execute and kanmer-plan living-docs duties; auto<->dispatch cross-references. **kanmer-import deleted** (13 -> 12).

**Where:** `plugins/kanmer/skills/*/SKILL.md`
**Plan:** `docs/plans/kanmer-v3/phase-6-skills-setup/plan.md` § 6.1
**Governing docs:** FRD-023 R1-R3, FRD-005, FRD-009, ADR-0009
**Depends:** 3.2 (frozen tool signatures); ideally 4 and 5 shipped for accurate GUI references

Starting point measured in Phase 0.2: nine of thirteen skills already call `get_doc_gates`, so the mechanism is in place — the work is deleting the restated rules. The "zero hardcoded gate rules" grep is this item's exit criterion.

Release rail: README skills table -> 12.
