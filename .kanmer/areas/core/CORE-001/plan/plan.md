# Plan

## Approach

Option **(a)** from the ticket — make the repo root a first-class notion in core — **plus** the
narrow derivation from option (b), minus its git coupling.

The ticket framed these as alternatives. They are complements, and picking only one is worse
than either:

- Explicit-only leaves every already-registered MCP server broken until its user happens to
  reconnect. There is no error to prompt them, because the failure looks like "the gate is
  enforced", not "something is misconfigured".
- Derivation-only puts an unoverridable heuristic in core, and the git variant
  (`git rev-parse --git-common-dir`) makes core shell out, which it does nowhere else.

So: `repoRoot` is explicit where the caller knows it, derived from the path shape where it does
not, and equal to `projectRoot` otherwise. A colocated board is unaffected in every case.

Derivation stays deliberately narrow — it recognises only `<x>/.worktrees/<name>`, the exact
shape `ensureBoardWorktree` builds (`kanmerGit.ts:50`), and returns null for anything else.
It never guesses from git state or directory contents.

## Secondary goal: close the class, not just the instance

This is the second bug of its shape (the watcher was the first). Both were **defaulted values
that silently resolved to the wrong root**. So the two remaining defaults get removed —
`dispatch.ts`'s `sourceRoot` and `connect.ts`'s `boardRoot` become required parameters. Neither
was reachable today; the point is that the compiler, not a reviewer, catches the third one.

## Steps

1. `paths.ts`: export `WORKTREES_DIR` and `deriveRepoRoot(boardRoot)`; `resolvePaths` takes an
   optional `repoRoot` and exposes it. `KanmerPaths` picks the member up automatically.
2. `store.ts`: constructor accepts `opts.repoRoot`; `assertRefs` validates against
   `paths.repoRoot` and names that root in the error so a failure is diagnosable.
3. `mcp-server/root.ts`: add `resolveRepoRoot` (`--repo-root` → `KANMER_REPO_ROOT` → undefined),
   factoring flag parsing into a shared `readFlag`. Undefined is normal, not a failure.
4. `mcp-server/index.ts`: pass it to the store.
5. `gui/main/index.ts`: pass `repoRoot: projectId` explicitly — the GUI knows both roots.
6. `gui/main/connect.ts`: `serverInvocation(boardRoot, sourceRoot)` appends `--repo-root` only
   when the roots differ; make `connectAgent`'s `boardRoot` required.
7. `gui/main/dispatch.ts`: make `sourceRoot` required; fix the callers the compiler names.
8. Tests: three in core covering derived, explicit, and colocated; update dispatch's callers.

## Alternatives rejected

- **(c) drop `refs` for `docs_todo`** — deletes the feature rather than fixing it, and guts the
  governing-doc gate to a boolean nobody has to justify.
- **Passing `repoRoot` through every call site instead of holding it on the store** — `refs`
  validation happens deep inside `createItem`/`updateItem`; threading a root through those
  signatures is far more churn than one constructor option.
- **Making `--repo-root` required on the server** — breaks every existing registration on
  upgrade, for a value that is derivable in the only case where it differs.

## Verification

Beyond the standing rail: prove it on this repo's own board — the exact `refs` call that failed
before the fix must succeed after it, and the gate it exists to satisfy must open.
