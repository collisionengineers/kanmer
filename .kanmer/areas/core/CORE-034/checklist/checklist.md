# Checklist — CORE-034

## Guard

- [ ] Add dependency-free `packages/core/src/worktree-guard.ts`.
- [ ] Resolve relative supplied worktrees against `repoRoot`.
- [ ] Normalize mixed separators and trailing separators.
- [ ] Apply Windows case-insensitive equality without changing non-Windows semantics.
- [ ] Reject equality with the actual `boardRoot`.
- [ ] Reject equality with canonical `<repoRoot>/.worktrees/kanmer`.
- [ ] Use equality, not prefix matching; do not reject sibling ticket worktrees.
- [ ] Export the guard from core.
- [ ] Call it in `takeTicket` before gates and any mutation, only when worktree is supplied.
- [ ] Confirm taking without a worktree remains valid.

## Guard tests

- [ ] Relative `.worktrees/kanmer` throws.
- [ ] Absolute board root throws.
- [ ] Canonical absolute board path throws.
- [ ] Mixed separators throw.
- [ ] Trailing separators throw.
- [ ] Windows casing variant throws under Windows semantics.
- [ ] `.worktrees/doc-011` succeeds.
- [ ] No-worktree take succeeds.
- [ ] Every rejected take leaves ticket bytes/status/taken fields unchanged.

## Health block

- [ ] Add non-throwing local Git branch inspection in MCP server.
- [ ] Add reciprocal comments linking MCP and GUI helper copies.
- [ ] Derive expected branch from trimmed `KANMER_BOARD_BRANCH` or `kanmer-board`.
- [ ] Compute active ticket count from already-read non-archived items.
- [ ] Add exactly `path`, `expectedBranch`, `actualBranch`, `onBoardBranch`, `boardSource`, `ticketCount`, and `repair`.
- [ ] Return `actualBranch: null`/unhealthy repair guidance instead of throwing on Git failure/detached HEAD.
- [ ] Keep `get_status` read-only and non-blocking; no repair or initialization.
- [ ] Update the existing `get_status` description.
- [ ] Add the paired observational GUI helper without rendering a banner.
- [ ] Test GUI helper healthy, wrong, and unavailable branch cases.
- [ ] Extend MCP smoke for shape, path, expected branch, source, count, healthy/unavailable behaviour.

## Build and scope

- [ ] Run focused core store tests.
- [ ] Run GUI Git-helper tests.
- [ ] Run typecheck, build, and MCP smoke.
- [ ] From a normal main checkout, run `npm run build && npm run plugin:build && npm run plugin:check`.
- [ ] Commit regenerated `plugins/kanmer/mcp/kanmer-mcp.cjs`; do not hand-edit it.
- [ ] Confirm `plugins/kanmer/tool-reference.md` is unchanged and no tool was added.
- [ ] Confirm core contains no Git/child-process invocation.
- [ ] Confirm no board repair, sync, dispatch, lease, gate, or GUI banner behaviour changed.
- [ ] Open the PR with `Kanmer: CORE-034` and name the production callers (`takeTicket` and `get_status`).
- [ ] Stop at review readiness; do not merge or begin GUI-098.

## Progress notes

Append exact failing/passing inputs and command outputs. Do not mark a normalization case complete from code inspection alone.
