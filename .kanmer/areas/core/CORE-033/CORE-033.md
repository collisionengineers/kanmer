---
id: CORE-033
type: ticket
title: Protect `main` and `kanmer-board`; write the ops playbook
status: verifying
area: core
order: 50
assignee: codex-take-core033
profile: chore
stageEntered:
  preparing: '2026-08-20T12:12:12.995Z'
  review: '2026-08-22T06:43:55.174Z'
  verifying: '2026-08-22T06:50:12.406Z'
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
commits:
  - 89e61bdfc1253cada07e27d2aa1b6b15a3c2b93a
  - 9bf60372147123199876b623aefe9cb222b60668
  - c283f4cc44f9c4ad765cf2ea6da34eda849b01f9
  - 44264b2fa18031d83d7f538db7725c0f27e2feca
prs:
  - '158'
archived: false
created: '2026-08-20T10:14:42.512Z'
updated: '2026-08-22T06:50:23.206Z'
---

## What
Branch protection: `main` requires PR + check `verify` + conversation resolution, no force push/deletion; `kanmer-board` no-force/no-delete, **no PR requirement** (board mutations are direct pushes by design). Playbook at `docs/plans/compiled-workflow/playbook.md` records the exact settings, the required-check names as the GitHub UI shows them, and the rules: enable only after `verify` is green **twice**; never require a check that has not appeared once; add `kanmer-gate` to required checks only after its job has posted (CORE-024).

## Verification
- [ ] un-checked PR cannot merge
- [ ] direct push to main refused
- [ ] board push still works

## Outcome

PR #158 (https://github.com/collisionengineers/kanmer/pull/158) merged to origin/main as 44264b2fa18031d83d7f538db7725c0f27e2feca. The exact main and kanmer-board branch protections are live and the durable playbook plus merged-main proof record the complete rollout. Review findings were dispositioned: CORE-042 owns the protected release-path adaptation and CORE-043 owns protection across board-branch renames.
