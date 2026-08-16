## Root-split sweep (2026-08-16)

Swept every use of the board root vs source root after the watcher bug, to find siblings.

**Core — one conflation only.** `store.ts:1011` (`assertRefs`) is the single place where
`this.paths.projectRoot` is used with *repo* semantics rather than *board storage* semantics.
Every other `projectRoot` use in core (`resolvePaths`, the `KanmerStore` constructor,
`watchKanmer`) correctly means "where `.kanmer/` lives".

Good news for the fix: `repoDocKindOf` / `repoDocsMap` (`docs.ts:80-109`) match the ref string
against globs with `globToRegExp` and **never touch the filesystem**. So governing-doc
classification is already root-independent — fixing `assertRefs` is sufficient to make the
leave-Backlog gate work end to end.

**GUI — no remaining active bugs.** `connectAgent`, `disconnectAgent`, `skillsStatus`,
`updateSkills`, `dispatchTicket` and the three repo-doc channels all receive
`requireCtx(p).sourceRoot` explicitly (`main/index.ts:616-629,681-691`). `kanmerGit.ts` uses
boardRoot for sync and sourceRoot for the gitignore, correctly.

**Two latent traps — same failure mode as the watcher.** Both are default parameters that
silently resolve to the wrong root if a caller ever omits them:

- `dispatch.ts:80` — `sourceRoot = store.paths.projectRoot`. The default is the **board
  worktree**, so a dispatch call that omits the argument spawns the agent inside
  `.worktrees/kanmer` instead of the repo. One caller today, and it passes explicitly.
- `connect.ts:227` — `boardRoot = projectRoot`. A connect call that omits it registers the MCP
  server against the **source** root, so the agent would open the wrong (or a fresh, empty)
  board. One caller today, and it passes explicitly.

Neither is reachable now, but both read as correct at the call site and fail silently — exactly
how the watcher survived review. Whoever fixes this ticket should make the roots required
parameters (or distinct types) rather than defaulted, so the compiler catches the next one.

**MCP server** structurally cannot do source-root work: it only ever receives `--root <boardRoot>`.
That is the constraint driving option (a) in this ticket.
