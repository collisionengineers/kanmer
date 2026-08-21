---
id: SKILL-001
type: ticket
title: 6.1 Roster sweep
status: done
area: skills
order: 140
assignee: /root/gui099_executor
profile: feature
stageEntered:
  verifying: '2026-08-21T08:55:12.558Z'
  review: '2026-08-21T08:55:12.771Z'
  implementing: '2026-08-21T08:55:12.979Z'
  done: '2026-08-21T21:27:21.616Z'
labels:
  - v3-phase-6
groups:
  - EPIC-007
  - HZN-007
links: []
blocks:
  - SKILL-002
  - SKILL-003
  - SKILL-004
  - SKILL-005
  - SKILL-006
  - SKILL-007
  - DOC-005
refs:
  - docs/functional/frd/FRD-023-agent-skills-system.md
  - docs/functional/frd/FRD-005-deep-research.md
  - docs/functional/frd/FRD-009-interrogative-workflow.md
  - docs/architecture/adr/ADR-0009-skills-are-not-the-contract.md
commits:
  - 130f837e34119af80532b4f5ccb17add896c56c8
  - 8af1991c8350ae4bf7b44532dd434ee24ce7b8e4
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/15'
archived: false
created: '2026-08-16T00:31:38.765Z'
updated: '2026-08-21T21:27:21.664Z'
---

All twelve remaining skills: gate prose deleted in favour of `get_doc_gates`; six-stage and folder-path references; read-everything openings including group context; questioning prose per skill; kanmer-research rewritten for quick/deep with source classes; kanmer-auto profile-partitioned waves and files/-overlap lanes; kanmer-verify typed proof; kanmer-execute and kanmer-plan living-docs duties; auto<->dispatch cross-references. **kanmer-import deleted** (13 -> 12).

**Where:** `plugins/kanmer/skills/*/SKILL.md`
**Plan:** `docs/plans/kanmer-v3/phase-6-skills-setup/plan.md` § 6.1
**Governing docs:** FRD-023 R1-R3, FRD-005, FRD-009, ADR-0009
**Depends:** 3.2 (frozen tool signatures); ideally 4 and 5 shipped for accurate GUI references

Starting point measured in Phase 0.2: nine of thirteen skills already call `get_doc_gates`, so the mechanism is in place — the work is deleting the restated rules. The "zero hardcoded gate rules" grep is this item's exit criterion.

Release rail: README skills table -> 12.
