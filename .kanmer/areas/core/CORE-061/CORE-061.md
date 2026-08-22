---
id: CORE-061
type: ticket
title: >-
  CORE-043 review remediation: record KANMER_BOARD_BRANCH convention in
  AGENTS.md
status: done
area: core
assignee: codex-core061-take
profile: fix
stageEntered:
  preparing: '2026-08-22T13:33:16.784Z'
  review: '2026-08-22T13:44:17.937Z'
  verifying: '2026-08-22T13:48:08.004Z'
  done: '2026-08-22T17:44:00.167Z'
labels:
  - pr-review
  - branch-protection
  - docs
groups:
  - HZN-007
links:
  - CORE-043
blocks: []
refs:
  - docs/functional/frd/FRD-020-board-git-worktree-sync.md
  - docs/architecture/adr/ADR-0016-compiled-workflow.md
commits:
  - 216dcdf0cc4fd1f303b9d68ed801d03c92e69c0a
  - 8c09342459a471f5941b014c577d14e6abc0ae56
prs:
  - '181'
archived: false
created: '2026-08-22T13:28:04.880Z'
updated: '2026-08-22T17:45:00.773Z'
---

Close the current CORE-043 review finding required by repository operating rules: update the governing AGENTS.md convention for KANMER_BOARD_BRANCH and the administrator handoff in the same scoped change, preserving the managed block contract and generated/manual synchronization. Add exact docs/managed-block evidence. Link [[CORE-043]].


## Outcome

PR #181 (https://github.com/collisionengineers/kanmer/pull/181) merged non-squash as 8c09342459a471f5941b014c577d14e6abc0ae56. The managed KANMER_BOARD_BRANCH convention is verified on the merged CORE-043 cumulative target. External GitHub variable/protection mutation remains an administrator-owned INCONCLUSIVE boundary; no follow-up source work was added.
