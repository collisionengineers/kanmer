---
id: CORE-067
type: ticket
title: 'CORE-058 review: refuse symlinked board ignore paths'
status: done
area: core
assignee: codex-recovery
profile: fix
stageEntered:
  implementing: '2026-08-22T15:05:08.966Z'
  review: '2026-08-22T15:12:10.013Z'
  verifying: '2026-08-22T15:13:28.836Z'
  done: '2026-08-23T00:03:51.538Z'
taken_at: '2026-08-22T15:05:09.805Z'
branch: core-067-refuse-ignore-symlink
worktree: .worktrees/core-067
labels:
  - pr-review
  - board-sync
  - review-finding
groups:
  - HZN-007
links:
  - CORE-058
blocks: []
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
commits:
  - fa628916df8555ee92ee3c5bf4e5e5f7c4efefe2
  - f0de2628b15028b59679f332c09a204f414437f8
prs:
  - '188'
archived: false
created: '2026-08-22T14:56:06.547Z'
updated: '2026-08-23T00:03:51.553Z'
---

Review finding from final PR #180 head b8d8a191161532e895fa399b6c95bf812dfdb2d0 (thread 3836285521). ensureIgnore follows a symlink at boardRoot/.gitignore; a tracked link can redirect reconciliation writes into .kanmer/data/board.yml or another target, corrupting board state. Inspect without following links and reject or safely replace symlinked board ignore paths, with deterministic coverage. Child of [[CORE-058]].

## Outcome

Verified on merged origin/main at fdaededcf8bff0c5d5867e386782d8bdc32324e9; PR #188 merged at f0de2628b15028b59679f332c09a204f414437f8; deterministic proof is recorded. External Windows/hosted/packaged/visual boundaries remain INCONCLUSIVE.
