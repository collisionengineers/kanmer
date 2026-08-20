# Open questions — CORE-034

All implementation decisions are resolved.

- [x] **What paths are forbidden?** — The resolved current board root and the canonical `<repoRoot>/.worktrees/kanmer` path.
- [x] **How are relative paths interpreted?** — Relative to `repoRoot`, because ticket worktrees are repository worktrees.
- [x] **How are paths compared?** — Resolve/normalize separators and trailing separators; compare case-insensitively under Windows semantics and case-sensitively otherwise.
- [x] **May a ticket be taken without a worktree?** — Yes. Existing optional-worktree behaviour remains.
- [x] **May another ticket worktree such as `.worktrees/doc-011` be recorded?** — Yes.
- [x] **Does core inspect Git?** — No. Core performs pure path comparison only.
- [x] **Where does actual branch inspection live?** — In paired small helpers in `packages/mcp-server` and `apps/gui/src/main/kanmerGit.ts`, with comments linking the two copies.
- [x] **What branch is expected?** — Trimmed `KANMER_BOARD_BRANCH` when set, otherwise `kanmer-board`.
- [x] **Does unhealthy board state block tools or trigger repair?** — No. `get_status.boardWorktree` is informational and repair remains an operator action.
- [x] **Is tool-reference changed?** — No new tool exists; update the `get_status` in-code description and rebuild the plugin bundle only.

## Parked (explicitly deferred)

No questions are parked.
