---
id: CORE-037
type: ticket
title: Normalize Windows temporary-path assertions in Git integration tests
status: done
area: core
assignee: codex-mcp-client
profile: fix
stageEntered:
  preparing: '2026-08-22T00:23:31.774Z'
  review: '2026-08-22T00:39:30.765Z'
  verifying: '2026-08-22T02:04:03.636Z'
  done: '2026-08-22T02:04:18.797Z'
labels:
  - remediation
  - ci
  - windows
  - test-stability
groups:
  - HZN-007
  - HZN-004
links:
  - CORE-032
  - GUI-075
  - SKILL-021
refs:
  - docs/functional/frd/FRD-020-board-git-worktree-sync.md
commits:
  - aac1e25243fe200cc936b31a1fe78e7d041cd08b
  - 72da8d0769af830480e06d719c3081671dcd0be9
  - 8a9eee57e1779f83f30504851e1bff0bf167247a
prs:
  - '145'
  - '144'
archived: false
created: '2026-08-22T00:14:25.688Z'
updated: '2026-08-22T02:12:40.452Z'
---

The shared Windows verify rail is red because apps/gui/src/main/kanmerGit.test.ts compares resolve(boardRoot) against the expected repo worktree path and Git/Node return different equivalent user-path spellings (RUNNER~1 versus runneradmin) on GitHub-hosted Windows. Normalize or compare path identity in a Windows-stable way without weakening the real Git/worktree assertions. Keep the test exercising the actual path/refs and preserve failure behavior for genuinely different locations. This remediation unblocks the required verify check used by CORE-032 and dependent review packets.
