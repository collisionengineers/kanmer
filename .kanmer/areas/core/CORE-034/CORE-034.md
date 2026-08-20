---
id: CORE-034
type: ticket
title: >-
  `takeTicket` refuses to record the board worktree; `get_status` reports
  board-worktree health
status: backlog
area: core
assignee: ''
profile: fix
labels: []
groups:
  - EPIC-009
  - HZN-004
links: []
archived: false
created: '2026-08-20T10:14:42.524Z'
updated: '2026-08-20T10:14:42.524Z'
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
