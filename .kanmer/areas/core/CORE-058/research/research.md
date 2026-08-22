# Research — CORE-058

## Question

How can the canonical board worktree retain the derived `.kanmer/data/sources/` cache out of Git for both newly created and already-existing/reconciled board worktrees, and how can the committed standalone plugin artifact be rebuilt from a normal checkout so `plugin:check` compares reproducible bytes?

## Findings

1. `apps/gui/src/main/kanmerGit.ts` owns board-worktree creation/reconciliation and synchronization. `ensureBoardWorktree()` currently adds `.kanmer/data/activity.jsonl` and atomic temporary-file rules only when it creates an orphan board worktree. Existing attached worktrees return without reconciling `.gitignore`; an existing board path on a mismatched branch reconciles only the repository root ignore. `syncBoard()` stages `.kanmer` and `.gitignore`, so a missing board-worktree cache rule can commit `data/sources`.
2. The source checkout ignore (`.gitignore`) already excludes `.kanmer/`; the missing rule belongs inside the canonical board worktree's own `.gitignore`. The source cache is derived local state under `.kanmer/data/sources`, so it must be ignored without changing ticket/source persistence.
3. `apps/gui/src/main/kanmerGit.test.ts` uses real local Git repositories and exercises orphan creation, existing/reopened worktrees, refs, and branch reconciliation. It is the correct deterministic seam for assertions that new and existing board worktrees contain the exact cache rule and that synchronization does not stage cache contents.
4. `scripts/build-plugin.mjs` copies `packages/mcp-server/dist/standalone/kanmer-mcp.cjs` into `plugins/kanmer/mcp/kanmer-mcp.cjs`; `scripts/check-plugin-sync.mjs` intentionally refuses a linked worktree unless `@kanmer/core` resolves to that checkout. The refusal prevents a nested worktree from silently bundling another checkout's core. The committed artifact must therefore be produced from a normal checkout with its own workspace dependency resolution, then byte-compared by `plugin:check` from that normal checkout.
5. `packages/mcp-server/tsup.standalone.config.ts` has `sourcemap: false` and a pure package-version define; the artifact should be generated, not hand-edited. No new dependency is needed. The normal-checkout parity proof should record the build/plugin/check commands, artifact SHA-256 and `plugin:check` exit.

## Scope implication

The source fix is limited to board-worktree ignore reconciliation plus deterministic Git tests. The artifact change is generated from the exact CORE-044 cumulative source branch in a non-linked checkout and committed as the plugin output. No source-fetch, GUI editor, provider, or board-worktree branch semantics are changed.
