---
id: SKILL-028
type: ticket
title: Exercise SKILL-016 durable resume on a disposable Kanmer board
status: backlog
area: skills
assignee: ''
profile: fix
labels:
  - pr-review
  - blocking
links: []
blocks:
  - SKILL-016
refs:
  - docs/functional/frd/FRD-023-agent-skills-system.md
archived: false
created: '2026-08-20T23:42:55.671Z'
updated: '2026-08-20T23:43:28.826Z'
---

## What

Exercise SKILL-016’s interruption/resume contract against a disposable **Kanmer board and group documents**, rather than only raw temporary files. The scenario must use the actual group-document API/surface to create the history record before the current pointer, restart from reads alone, reconcile a live ticket change without replay, refuse project/other-controller mismatch without mutation, and retain prior history for a second run.

## Why

PR #92’s `scripts/auto-run-state.test.mjs` passes but only writes raw files and calls a local `resumeDecision` helper. It does not establish that Kanmer group documents, paths, or read/write semantics support the claimed cross-controller recovery.

## Verification

- [ ] Disposable board/group test uses actual Kanmer group-document operations.
- [ ] Interruption/resume/reconciliation/refusal/history evidence is captured.
- [ ] Existing prose rail and targeted scenario test pass.

## Outcome
