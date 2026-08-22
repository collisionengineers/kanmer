---
id: CORE-037
type: ticket
title: Normalize Windows temporary-path assertions in Git integration tests
status: backlog
area: core
assignee: ''
profile: fix
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
archived: false
created: '2026-08-22T00:14:25.688Z'
updated: '2026-08-22T00:14:25.688Z'
---

The shared Windows verify rail is red because apps/gui/src/main/kanmerGit.test.ts compares resolve(boardRoot) against the expected repo worktree path and Git/Node return different equivalent user-path spellings (RUNNER~1 versus runneradmin) on GitHub-hosted Windows. Normalize or compare path identity in a Windows-stable way without weakening the real Git/worktree assertions. Keep the test exercising the actual path/refs and preserve failure behavior for genuinely different locations. This remediation unblocks the required verify check used by CORE-032 and dependent review packets.
