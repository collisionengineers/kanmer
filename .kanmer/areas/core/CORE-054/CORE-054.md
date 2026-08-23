---
id: CORE-054
type: ticket
title: 'CORE-052 review remediation: refuse unexpected branch without auto-rename'
status: done
area: core
assignee: codex-core054-executor
profile: fix
stageEntered:
  preparing: '2026-08-22T12:52:23.815Z'
  implementing: '2026-08-22T12:52:44.944Z'
  review: '2026-08-22T12:58:45.363Z'
  verifying: '2026-08-22T13:16:20.854Z'
  done: '2026-08-23T00:42:03.264Z'
labels:
  - pr-review
  - branch-protection
  - board-sync
groups:
  - HZN-007
links:
  - CORE-052
blocks: []
refs:
  - docs/functional/frd/FRD-020-board-git-worktree-sync.md
  - docs/architecture/adr/ADR-0016-compiled-workflow.md
commits:
  - 1ef6852a
  - 3964c2ca
  - b7957214
prs:
  - '176'
  - '177'
archived: false
created: '2026-08-22T12:51:54.808Z'
updated: '2026-08-23T00:45:25.574Z'
---

Close CORE-052 review P1: when refresh observes a live board worktree on an unexpected branch, the protected refusal path must not call renameBoardBranch or alter refs/worktree. Preserve the current preference, surface mismatch/paused state, and add an integration regression proving no automatic rename. Link [[CORE-052]].


## Closeout outcome

PR #176 (https://github.com/collisionengineers/kanmer/pull/176) merged 2026-08-22T13:16:09Z; PR #177 (https://github.com/collisionengineers/kanmer/pull/177) merged 2026-08-22T13:12:06Z. Recorded merged-main proof on origin/main a8cc6b01; deterministic evidence and explicit INCONCLUSIVE boundaries are in proof.md.
