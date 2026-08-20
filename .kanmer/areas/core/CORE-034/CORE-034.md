---
id: CORE-034
type: ticket
title: >-
  `takeTicket` refuses to record the board worktree; `get_status` reports
  board-worktree health
status: done
area: core
order: 60
assignee: codex-mcp-client
profile: fix
stageEntered:
  preparing: '2026-08-20T12:18:19.217Z'
  review: '2026-08-20T22:27:08.886Z'
  verifying: '2026-08-20T22:29:13.663Z'
  done: '2026-08-20T22:33:32.294Z'
taken_at: '2026-08-20T22:14:37.366Z'
branch: core-034-board-worktree-health
worktree: .worktrees/core-034
labels: []
groups:
  - EPIC-009
  - HZN-004
links: []
commits:
  - 3aea9975a8c6fadac819533bce9aa3f4290bf115
  - b770563ae018bf143b00e6ec0ec12461a7b333e1
  - 8f975a487a1a53d1af4f6edb4a5baa95930a36c3
  - b44565c776b0db6ab84e8362b5487196752f722b
prs:
  - '82'
archived: false
created: '2026-08-20T10:14:42.524Z'
updated: '2026-08-20T22:33:32.294Z'
---

## What
(a) pure path guard (`packages/core/src/worktree-guard.ts`) — `takeTicket` throws when the recorded `worktree` resolves to the board root or `<repo>/.worktrees/kanmer` (Windows case-insensitive compare; relative and absolute forms; trailing separators). Taking without a worktree stays allowed. (b) `get_status` gains `boardWorktree: {path, expectedBranch, actualBranch, onBoardBranch, boardSource, ticketCount, repair}` — informational, never blocking.

## Why
the DOC-010-era incident (board worktree checked out to a ticket branch, MCP serving an empty default board) is repaired but invisible; and nothing stops an agent recording the board path as its ticket worktree.

## Approach
no git subprocess in core (FRD-002 G2a) — path comparison only. The git inspect helper (~20 lines) is **duplicated** in `packages/mcp-server` and `apps/gui/src/main/kanmerGit.ts`, commented as a pair — do not extract a shared git package. `expectedBranch` defaults to `kanmer-board`, overridable via `KANMER_BOARD_BRANCH` env. MCP tool surface changed ⇒ `npm run build && npm run plugin:build && npm run plugin:check` **from the main checkout**, tool-reference untouched (no new tool).

## Verification
- [ ] store tests — take with `.worktrees/kanmer`, with the absolute board path, with mixed separators all throw
- [ ] `.worktrees/doc-011` succeeds
- [ ] smoke asserts the health block

## Outcome
