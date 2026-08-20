# Post-implementation report — CORE-034

## Summary

CORE-034 prevents an agent from recording Kanmer’s shared board workspace as a ticket worktree and exposes board-worktree health through the existing read-only `get_status` response. The guard is pure core path logic; Git inspection remains a small paired concern in MCP and GUI. No repair, checkout, initialization, UI banner, gate, lease, or tool was added.

## Changes

| File | Change | Rationale |
|---|---|---|
| `packages/core/src/worktree-guard.ts` | Added exported normalization/equality guard for the configured board root and canonical `<repo>/.worktrees/kanmer`. | Stops the unsafe metadata record without Git or filesystem mutation. |
| `packages/core/src/index.ts` | Exported the guard. | Makes the core helper available through the package entry point. |
| `packages/core/src/store.ts` | Calls the guard before `takeTicket` gates or writes when `worktree` is supplied. | Rejections leave ticket fields and bytes unchanged; missing worktrees remain valid. |
| `packages/core/src/store.test.ts` | Added forbidden relative/absolute/mixed/trailing/casing cases plus valid sibling/no-worktree cases. | Covers normalization and no-write behavior. |
| `packages/mcp-server/src/index.ts` | Added non-throwing local branch inspection and the exact informational `boardWorktree` status block. | Reports health without putting a Git subprocess in core or mutating board state. |
| `packages/mcp-server/src/smoke.mjs` | Added shape, unavailable-Git, healthy branch, ticket count, default-branch, and env-override checks. | Verifies the public MCP response and non-blocking behavior. |
| `apps/gui/src/main/kanmerGit.ts` | Added paired `inspectBoardWorktree` observer. | Gives GUI-098 a stable health primitive without rendering a banner. |
| `apps/gui/src/main/kanmerGit.test.ts` | Added healthy, wrong, unavailable, and expected-branch override tests. | Confirms observation does not repair the board worktree. |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | Regenerated from the synchronized branch in a non-linked checkout. | Keeps the committed plugin runtime byte-aligned with MCP/core source. |

## Governing constraints

- **EPIC-009:** implements only the guard and health observation, not leases or a new gate.
- **FRD-002 G2a:** core remains free of Git/child-process calls; `rg` confirmed none.
- **FRD-020:** health is operator guidance only; repair ownership remains Kanmer setup/board Git repair.
- **MASTERPLAN S-04:** covers both forbidden paths with repo-relative normalization, the seven requested health fields, trimmed `KANMER_BOARD_BRANCH`, paired local helpers, and a generated plugin bundle.
- **GUI-098:** remains out of scope; the GUI helper is exported but not rendered.

## Verification

- `npm test --workspace @kanmer/core -- --run src/store.test.ts` — 81/81 passed.
- `npx vitest run src/main/kanmerGit.test.ts --testNamePattern inspectBoardWorktree --maxWorkers=1 --minWorkers=1` — 4/4 passed (unrelated real-Git tests skipped).
- `node packages/mcp-server/src/smoke.mjs` — 163/163 passed for the default branch and again with `KANMER_BOARD_BRANCH=team-board`.
- Changed-package typechecks for `@kanmer/core`, `@kanmer/mcp-server`, and `@kanmer/gui` passed.
- A fresh non-linked checkout ran `npm ci`, `npm run plugin:build`, and `npm run plugin:check`: 30 tools match, bundle bytes match, 12 skill frontmatters parse.
- `npm run verify:skills` and `git diff --check` passed.

## Known verification limitation

The repository-wide `npm run typecheck` is blocked by a pre-existing `@kanmer/ui/src/demo.tsx` error: a `getTicketDocsInfo` result omits required `documentPaths`. CORE-034 does not modify that workspace; all changed-package typechecks pass.

## Risks and follow-up

- The guard protects only the recorded ticket worktree metadata; it cannot prevent a raw Git checkout from misusing the board worktree. The new health block makes that operational state visible.
- Branch inspection failures are deliberately data (`actualBranch: null`), not tool failures.
- GUI-098 owns rendering this health information. No user-only question remains.

## Verification hand-off

On merged main, run the focused core and GUI tests, the default and `KANMER_BOARD_BRANCH` MCP smokes, then `npm run plugin:build && npm run plugin:check` from a normal checkout before final proof. Do not treat the unrelated UI typecheck failure as evidence about this ticket.
