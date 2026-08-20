# Checklist — CORE-034

## Guard

- [x] Add dependency-free `packages/core/src/worktree-guard.ts`.
- [x] Resolve relative supplied worktrees against `repoRoot`.
- [x] Normalize mixed separators and trailing separators.
- [x] Apply Windows case-insensitive equality without changing non-Windows semantics.
- [x] Reject equality with the actual `boardRoot`.
- [x] Reject equality with canonical `<repoRoot>/.worktrees/kanmer`.
- [x] Use equality, not prefix matching; do not reject sibling ticket worktrees.
- [x] Export the guard from core.
- [x] Call it in `takeTicket` before gates and any mutation, only when worktree is supplied.
- [x] Confirm taking without a worktree remains valid.

## Guard tests

- [x] Relative `.worktrees/kanmer` throws.
- [x] Absolute board root throws.
- [x] Canonical absolute board path throws.
- [x] Mixed separators throw.
- [x] Trailing separators throw.
- [x] Windows casing variant throws under Windows semantics.
- [x] `.worktrees/doc-011` succeeds.
- [x] No-worktree take succeeds.
- [x] Every rejected take leaves ticket bytes/status/taken fields unchanged.

## Health block

- [x] Add non-throwing local Git branch inspection in MCP server.
- [x] Add reciprocal comments linking MCP and GUI helper copies.
- [x] Derive expected branch from trimmed `KANMER_BOARD_BRANCH` or `kanmer-board`.
- [x] Compute active ticket count from already-read non-archived items.
- [x] Add exactly `path`, `expectedBranch`, `actualBranch`, `onBoardBranch`, `boardSource`, `ticketCount`, and `repair`.
- [x] Return `actualBranch: null`/unhealthy repair guidance instead of throwing on Git failure/detached HEAD.
- [x] Keep `get_status` read-only and non-blocking; no repair or initialization.
- [x] Update the existing `get_status` description.
- [x] Add the paired observational GUI helper without rendering a banner.
- [x] Test GUI helper healthy, wrong, and unavailable branch cases.
- [x] Extend MCP smoke for shape, path, expected branch, source, count, healthy/unavailable behaviour.

## Build and scope

- [x] Run focused core store tests.
- [x] Run GUI Git-helper tests.
- [x] Run typecheck, build, and MCP smoke.
- [x] From a normal main checkout, run `npm run build && npm run plugin:build && npm run plugin:check`.
- [x] Commit regenerated `plugins/kanmer/mcp/kanmer-mcp.cjs`; do not hand-edit it.
- [x] Confirm `plugins/kanmer/tool-reference.md` is unchanged and no tool was added.
- [x] Confirm core contains no Git/child-process invocation.
- [x] Confirm no board repair, sync, dispatch, lease, gate, or GUI banner behaviour changed.
- [x] Open the PR with `Kanmer: CORE-034` and name the production callers (`takeTicket` and `get_status`).
- [x] Stop at review readiness; do not merge or begin GUI-098.

## Progress notes

- Guard coverage: `npm test --workspace @kanmer/core -- --run src/store.test.ts` passed 81/81, including relative, absolute, canonical, mixed-separator, trailing-separator, Windows-casing, sibling, no-worktree, and no-write cases.
- GUI observer coverage: `npx vitest run src/main/kanmerGit.test.ts --testNamePattern inspectBoardWorktree --maxWorkers=1 --minWorkers=1` passed 4/4 (7 unrelated tests skipped). The broad GUI file run is timing-sensitive under GUI-085; the focused deterministic run is the relevant ticket coverage.
- MCP smoke passed 163/163 with both the default `kanmer-board` and `KANMER_BOARD_BRANCH=team-board` expected branches.
- Changed-package typechecks for core, MCP server, and GUI passed. The repository-wide `npm run typecheck` remains blocked by an existing `@kanmer/ui/src/demo.tsx` mismatch: its `getTicketDocsInfo` return omits required `documentPaths`; this ticket does not touch that package.
- A fresh non-linked checkout of this branch ran `npm ci`, `npm run plugin:build`, and `npm run plugin:check`; it passed with 30 tools, matching bundle bytes, and 12 skill frontmatters. The generated bundle SHA-256 was copied byte-for-byte before committing; it was not hand-edited.
