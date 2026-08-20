# Research — CORE-034: board-worktree guard and health observation

## Questions

1. Where should `takeTicket` reject the board worktree without violating core’s no-git boundary?
2. How can `get_status` report the actual board branch without turning a read tool into a repair path?
3. Which tests and bundled artifacts must change?

## Findings

### Core path model

- `KanmerStore.paths.projectRoot` is the board root. When the board is in Kanmer’s standard worktree layout it is `<repo>/.worktrees/kanmer`; `paths.repoRoot` is the source checkout. Sources: `packages/core/src/paths.ts` and `KanmerStore` constructor in `packages/core/src/store.ts`.
- `takeTicket` currently validates occupancy and stage gates, then copies `input.worktree` directly into ticket frontmatter. Source: `packages/core/src/store.ts`, `takeTicket`.
- Core already imports and exports path helpers but intentionally performs no Git inspection. The guard can therefore be a pure function over `input.worktree`, `paths.projectRoot`, and `paths.repoRoot`.
- A supplied worktree may be relative to the source repository or absolute. Windows comparisons must treat drive-letter/casing differences, `/` versus `\`, and trailing separators as equivalent. A path such as `.worktrees/kanmer` must resolve against `repoRoot`, not process cwd or the board root.
- Two forbidden targets are required:
  1. the actual configured board root (`paths.projectRoot`), including a nonstandard/adopted board location;
  2. the canonical `<repoRoot>/.worktrees/kanmer` location, even if the current board was discovered differently.
  Taking without `worktree` remains valid, and ordinary ticket paths such as `.worktrees/doc-011` remain valid.
- The safest timing is before any gate evaluation or ticket write. A rejected take must leave stage, assignee, branch, timestamps, and bytes unchanged.

### Health observation

- `get_status` already computes board source, item counts, project/repo roots, and server/repo health in `packages/mcp-server/src/index.ts`; it is read-only and never calls initialization.
- The actual checked-out branch is not core state. It must be obtained in the MCP server with a tiny Git helper, because core’s FRD-002 G2a boundary forbids Git subprocesses.
- `apps/gui/src/main/kanmerGit.ts` already has local `git()` and `currentBranch()` helpers. The MASTERPLAN deliberately requires a second, small MCP-server implementation rather than a shared Git package; each copy must contain a paired-maintenance comment naming the other.
- `expectedBranch` is configuration, not discovery: `process.env.KANMER_BOARD_BRANCH?.trim() || "kanmer-board"`.
- Required status shape:
  - `path`: resolved board root (`projectRoot`);
  - `expectedBranch`: env/default value;
  - `actualBranch`: symbolic branch or `null` when unavailable/detached/non-Git;
  - `onBoardBranch`: strict branch-name equality;
  - `boardSource`: existing `file | default` source;
  - `ticketCount`: active ticket count (`type === "ticket" && !archived`), not all item types and not archived tickets;
  - `repair`: deterministic human instruction. Healthy should not fabricate work; unhealthy should name the expected branch/path and direct the operator to repair the board worktree rather than doing so automatically.
- Git inspection failure must degrade to data (`actualBranch: null`, `onBoardBranch: false`, repair text), not fail `get_status`.

### Tests and packaging

- Store tests are in `packages/core/src/store.test.ts`; they can create a board at the normal `repo/.worktrees/kanmer` shape and assert exact no-write behaviour across relative, absolute, mixed-separator, casing, and trailing-separator inputs.
- MCP smoke assertions belong in `packages/mcp-server/src/smoke.mjs`. The smoke sandbox is not normally a linked worktree, so it should at minimum assert presence/types/path/source/count and non-throwing branch inspection. A dedicated temporary Git repository/branch fixture is required if asserting `onBoardBranch: true` deterministically.
- `get_status`’s MCP output changes but no new tool or input field is added. Update its description in `packages/mcp-server/src/index.ts`; do not add a new row to `plugins/kanmer/tool-reference.md`.
- MCP implementation changes require `npm run build`, `npm run plugin:build`, and `npm run plugin:check` from a normal main checkout, per the adopted bundle rule.

## Decisions

- Add a pure exported guard in `packages/core/src/worktree-guard.ts` and call it before `takeTicket` does any state/gate work.
- Resolve relative supplied paths against `repoRoot`; normalize absolute forms with `path.resolve`, strip trailing separators through resolution, and case-fold only on Windows semantics.
- Keep two small Git inspectors, one in MCP and one in GUI, with cross-reference comments; do not introduce a package.
- Health remains informational. It does not block tools, call `ensureBoardWorktree`, checkout branches, or rewrite the board.

## Remaining unknowns

None. Error wording and repair wording may be polished during implementation, but the forbidden paths, status fields, branch source, failure behaviour, and ownership boundaries are fixed.
