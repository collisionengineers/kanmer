# Where the change lands

## Files to change

| Path | Why | Risk |
|---|---|---|
| `packages/core/src/paths.ts` | `resolvePaths(projectRoot, repoRoot?)` gains a `repoRoot` member; new exported `deriveRepoRoot()` and `WORKTREES_DIR`. | Medium — `KanmerPaths` is `ReturnType<typeof resolvePaths>`, so the new member propagates to every consumer's types automatically. Additive, so nothing breaks. |
| `packages/core/src/store.ts` | Constructor takes `opts.repoRoot`; `assertRefs` validates against `paths.repoRoot` and names it in the error. | Low — one call site. |
| `packages/mcp-server/src/root.ts` | New `resolveRepoRoot()`; `--root` parsing factored into a shared `readFlag()`. | Low — `resolveProjectRoot`'s behaviour is unchanged. |
| `packages/mcp-server/src/index.ts` | Resolve `repoRoot` and pass it to the store. | Low. |
| `apps/gui/src/main/index.ts` | `new KanmerStore(boardRoot, { repoRoot: projectId })` — explicit, since the GUI knows both. | Low. |
| `apps/gui/src/main/connect.ts` | `serverInvocation(boardRoot, sourceRoot)` emits `--repo-root` when the roots differ; `connectAgent`'s `boardRoot` becomes **required**. | Medium — changes the registered command line, so existing registrations only pick it up on reconnect. Mitigated by the derivation fallback. |
| `apps/gui/src/main/dispatch.ts` | `sourceRoot` becomes **required**. | Low, and the compiler finds every caller. |
| `packages/core/src/docs.test.ts` | Three regression tests. | — |
| `apps/gui/src/main/dispatch.test.ts` | Four call sites updated for the now-required argument. | — |

## Context files

| Path | What it tells the implementer |
|---|---|
| `apps/gui/src/main/kanmerGit.ts:50` | `join(repoRoot, ".worktrees", "kanmer")` — the exact shape `deriveRepoRoot` reverses. The derivation is only safe because Kanmer itself builds the path this way. |
| `packages/core/src/docs.ts:80-109` | `repoDocKindOf` is pure glob-vs-string; confirms no second fix is needed for gate classification. |
| `packages/core/src/paths.ts` `assertSafeRepoPath` | Already parameterised on its root — the traversal guard was never the problem. |
| `AGENTS.md` §8 gotcha 4 | The installed app runs the server as Electron-as-Node with `--root`; the new flag rides the same argv. |

## Design note — why derivation *and* an explicit flag

Explicit alone would leave every already-registered MCP server broken until the user happened to
reconnect, with no error to prompt them. Derivation alone would be a heuristic in core with no
override. Doing both means: correct immediately for existing installs, explicit and exact where
the caller knows better, and identical behaviour for a colocated board (both collapse to
`projectRoot`).

`deriveRepoRoot` is deliberately narrow — it matches only `<x>/.worktrees/<name>`, the shape
`ensureBoardWorktree` creates, and returns null otherwise.

## Not touched

The tool surface (no new or renamed tools, so `plugin:check`'s count is unchanged), the skills,
and the GUI renderer. `--repo-root` is additive and optional.
