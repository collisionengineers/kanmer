---
id: CORE-033
type: ticket
title: Protect `main` and `kanmer-board`; write the ops playbook
status: review
area: core
order: 50
assignee: codex-take-core033
profile: chore
stageEntered:
  preparing: '2026-08-20T12:12:12.995Z'
  review: '2026-08-22T06:43:55.174Z'
taken_at: '2026-08-22T06:35:32.959Z'
branch: core-033-branch-protection
worktree: .worktrees/core-033
labels: []
groups:
  - EPIC-009
  - HZN-004
  - HZN-007
links: []
blocks:
  - CORE-035
refs:
  - docs/functional/frd/FRD-020-board-git-worktree-sync.md
  - docs/architecture/adr/ADR-0016-compiled-workflow.md
archived: false
created: '2026-08-20T10:14:42.512Z'
updated: '2026-08-22T06:44:11.445Z'
---

## What
Branch protection: `main` requires PR + check `verify` + conversation resolution, no force push/deletion; `kanmer-board` no-force/no-delete, **no PR requirement** (board mutations are direct pushes by design). Playbook at `docs/plans/compiled-workflow/playbook.md` records the exact settings, the required-check names as the GitHub UI shows them, and the rules: enable only after `verify` is green **twice**; never require a check that has not appeared once; add `kanmer-gate` to required checks only after its job has posted (CORE-024).

## Verification
- [ ] un-checked PR cannot merge
- [ ] direct push to main refused
- [ ] board push still works

## Outcome
