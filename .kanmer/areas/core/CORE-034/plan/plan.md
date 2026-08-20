# Plan — CORE-034: guard the board worktree and report its health

## Objective

Prevent `takeTicket` from recording the board worktree as an implementation workspace, and make the board worktree’s actual branch state visible in `get_status` without repairing or blocking anything.

## Starting state

- `takeTicket` copies any supplied `worktree` string into ticket frontmatter.
- Core knows both board root and source repo root but performs no Git inspection.
- `get_status` reports board identity/source/counts but not the branch actually checked out at the board path.
- GUI Git code already has local process helpers; the MCP server does not.

## Governing constraints

- EPIC-009: this is guard + health only; no lease or new gate.
- FRD-002 G2a: no Git subprocess in core.
- FRD-020: board repair remains an operational GUI/setup concern.
- MASTERPLAN S-04: exact forbidden paths/normalization, exact health fields, expected-branch env, deliberate duplicated Git helper, plugin rebuild from main checkout.

## Required changes

1. Add `packages/core/src/worktree-guard.ts`.
2. Implement a small normalization function that:
   - accepts an input path and base path;
   - converts mixed separators to platform-safe form before resolution;
   - resolves relative paths against `repoRoot`;
   - removes trailing separators through canonical resolution;
   - folds case when applying Windows comparison semantics.
3. Implement/export `assertNotBoardWorktree(worktree, {boardRoot, repoRoot})` (name may vary only if equally explicit).
4. Compute both forbidden normalized candidates:
   - `boardRoot`;
   - `path.join(repoRoot, ".worktrees", "kanmer")`.
5. Throw a single actionable error when the supplied worktree equals either candidate. The message must name the supplied path, say it is the board workspace, and instruct use of `.worktrees/<ticket-id>` or omit the worktree.
6. Export the helper from `packages/core/src/index.ts`.
7. In `KanmerStore.takeTicket`, call the helper only when `input.worktree !== undefined`, before reading/evaluating gates or building `next` state.
8. Do not reject a missing worktree, source repo root, sibling ticket worktree, or textual path that normalizes elsewhere.
9. Add store regression tests using a repository fixture whose board root is `<repo>/.worktrees/kanmer`:
   - relative `.worktrees/kanmer` rejects;
   - absolute `store.paths.projectRoot` rejects;
   - canonical absolute path rejects;
   - mixed separators reject;
   - trailing separators reject;
   - Windows case variants reject under Windows semantics;
   - `.worktrees/doc-011` succeeds;
   - no worktree succeeds;
   - every rejection leaves original serialized ticket unchanged.
10. In `packages/mcp-server/src/index.ts`, add a local async Git helper using `execFile("git", ["symbolic-ref", "--short", "HEAD"])` with `cwd: projectRoot` and `windowsHide: true`.
11. Catch every inspection error and return `null`; never make `get_status` fail.
12. Add a paired-maintenance comment naming `apps/gui/src/main/kanmerGit.ts` and explaining why no shared package exists.
13. Compute once per `get_status` call:
    - `expectedBranch = process.env.KANMER_BOARD_BRANCH?.trim() || "kanmer-board"`;
    - `actualBranch` from the inspector;
    - `onBoardBranch = actualBranch === expectedBranch`;
    - active `ticketCount` from the already-listed non-archived items.
14. Add `boardWorktree` to the status response with exactly: `path`, `expectedBranch`, `actualBranch`, `onBoardBranch`, `boardSource`, `ticketCount`, `repair`.
15. Use deterministic repair text:
    - healthy: state that no repair is required;
    - wrong branch: name actual/expected and direct the operator to restore the board worktree through Kanmer setup/board Git repair;
    - unavailable/detached: say branch inspection failed/detached and direct the same operator repair;
    - synthesized default: explicitly state that the path is serving a default board and should be checked when tickets are expected.
16. Update the `get_status` description to document the new block as informational/non-blocking.
17. In `apps/gui/src/main/kanmerGit.ts`, add/export the equivalent observational inspect helper, reusing local `git()`/`currentBranch()`, and add the reciprocal paired-maintenance comment.
18. Test the GUI helper for expected, wrong, null/detached, and env/argument override cases; do not implement GUI rendering.
19. Extend `packages/mcp-server/src/smoke.mjs` to assert all seven keys, types, resolved path, default expected branch, correct active-ticket count, and no error from unavailable Git.
20. Add a temporary Git repository/branch fixture to assert `actualBranch` and `onBoardBranch: true` deterministically if the existing smoke sandbox cannot provide one.
21. Run focused core/GUI tests, typecheck, and MCP smoke.
22. From the normal main checkout after applying the ticket branch/merge workflow, run `npm run build`, `npm run plugin:build`, and `npm run plugin:check`; commit the regenerated bundle.
23. Confirm no tool-reference row changed and no new tool count was introduced.

## Expected files

Add:
- `packages/core/src/worktree-guard.ts`

Modify:
- `packages/core/src/index.ts`
- `packages/core/src/store.ts`
- `packages/core/src/store.test.ts`
- `packages/mcp-server/src/index.ts`
- `packages/mcp-server/src/smoke.mjs`
- `apps/gui/src/main/kanmerGit.ts`
- `apps/gui/src/main/kanmerGit.test.ts`
- `plugins/kanmer/mcp/kanmer-mcp.cjs` (generated)

## Acceptance checks

- All forbidden path variants throw before any ticket mutation.
- Missing worktree and `.worktrees/doc-011` remain valid.
- Core source contains no child-process/Git invocation.
- `get_status.boardWorktree` has exactly the required fields and remains available when Git inspection fails.
- `ticketCount` counts active tickets only.
- `expectedBranch` honours `KANMER_BOARD_BRANCH` and defaults to `kanmer-board`.
- Health is informational: no checkout, repair, initialization, or tool refusal occurs.
- MCP and GUI helpers remain small paired copies with explicit comments.
- Build, focused tests, smoke, plugin build/check all pass; committed plugin bytes are synchronized.

## Verification commands

```bash
npm test --workspace @kanmer/core -- --run packages/core/src/store.test.ts
npm test --workspace @kanmer/gui -- --run src/main/kanmerGit.test.ts
npm run typecheck
npm run build
node packages/mcp-server/src/smoke.mjs
```

From a normal main checkout for generated artifact validation:

```bash
npm run build
npm run plugin:build
npm run plugin:check
git status --short
```

## Risks and deviations

- Path normalization that uses process cwd will miss relative repository paths; use `repoRoot` explicitly.
- A prefix comparison would falsely reject `.worktrees/kanmer-other`; compare normalized equality only.
- Platform-only tests can miss Windows casing on non-Windows CI; isolate comparison semantics so they can be unit-tested deterministically.
- Git failure must become health data, not a thrown tool error.
- Do not extract a shared Git package, add a gate, alter board repair, or implement GUI-098.
- If an existing adopted board uses a noncanonical location, actual `boardRoot` still must be rejected.

## Stop condition

Stop when the pure guard has complete no-write regression coverage, `get_status` returns the exact non-blocking health block under healthy and failed inspection cases, the paired GUI helper is tested but not rendered, the MCP bundle is synchronized from a normal checkout, and the PR is ready for independent review. Do not merge or begin GUI-098.
