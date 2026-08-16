---
id: CORE-001
type: ticket
title: refs cannot be set on a board-worktree project
status: backlog
area: core
priority: medium
assignee: ''
labels:
  - v3-blocker
  - bug
links: []
blocks:
  - DOC-005
docs_todo: true
archived: false
created: '2026-08-16T00:29:22.207Z'
updated: '2026-08-16T00:32:34.958Z'
---

`assertRefs` (`packages/core/src/store.ts:1009-1016`) resolves each ref against `this.paths.projectRoot`, which for both the MCP server and the GUI is the **board worktree** (`.worktrees/kanmer`). Governing documents live in the **source checkout**. So every `refs` entry is rejected:

    create_item(refs: ["docs/functional/frd/FRD-002-requirement-profiles.md"])
    -> Referenced document "..." does not exist under the project root.

Confirmed live against this repo's own board.

**Why it matters:** FRD-002 P4 makes a non-empty `refs` one of the two ways to satisfy the leave-Backlog governing-doc gate, and FRD-020 makes the board worktree the shipped model. Together they mean the gate is unsatisfiable-by-refs on a normal setup — only `docs_todo: true` works, which is the escape hatch, not the intent.

**The GUI is already inconsistent with core here:** it picks, opens and reads repo docs against `sourceRoot` (`apps/gui/src/main/index.ts:681,685,691`), so its own picker produces paths the store then refuses.

**Fix needs a decision.** Core's `KanmerStore` knows only one root. Options: (a) give it an optional `repoRoot` defaulting to `projectRoot`, used by `assertRefs` and `repoDocKindOf`, and plumb it from the GUI (which has `sourceRoot`) and from the MCP server via a new `--repo-root` flag; (b) derive the source root from the board root inside core (`git rev-parse --git-common-dir` from the worktree), which needs no contract change but couples core to git; (c) accept the limitation and drop refs in favour of `docs_todo`. (a) is the honest one but changes the server's CLI contract.

Blocks proper `refs` on every seeded roadmap ticket.
