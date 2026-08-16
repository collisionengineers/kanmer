# Post-implementation report

## What changed

`refs` now resolve against the **repo root** — the source checkout — instead of the store's
project root. On a board-worktree project those are different directories, which is why the
governing-doc gate could not be satisfied by a ref at all.

`repoRoot` became a first-class member of `KanmerPaths`, resolved in three tiers:

1. explicit — `new KanmerStore(board, { repoRoot })`, or the server's `--repo-root` /
   `KANMER_REPO_ROOT`;
2. derived — `deriveRepoRoot()` reverses the `<x>/.worktrees/<name>` shape that
   `ensureBoardWorktree` builds;
3. fallback — `projectRoot`, so a colocated board behaves exactly as before.

The derivation is what makes this land without a flag day: MCP servers registered before
`--repo-root` existed start working immediately, with no reconnect and no error the user would
have had to notice first.

## Deviation from the plan

None in substance. The plan chose option (a) *combined with* a non-git variant of (b), rather
than either alone as the ticket had framed them — that reasoning is recorded in `plan.md` and
was settled before implementation.

One incidental fix not in the original scope: `serverInvocation` had a local `repoRoot` meaning
the *Kanmer install* directory, directly shadowing the new concept. Renamed to `installRoot`.
Leaving two different `repoRoot`s in one file, one of them meaning something else entirely, was
too good a trap to leave behind given what this ticket is about.

## Closing the class

This was the second bug of its shape after the watcher, and both were **defaulted values that
silently resolved to the wrong root**. The two remaining defaults are now required parameters:
`dispatch.ts`'s `sourceRoot` (defaulted to the *board* root, so an omitted argument would have
spawned agents inside `.worktrees/kanmer`) and `connect.ts`'s `boardRoot`.

Neither was reachable — each had exactly one caller, passing explicitly. The point is that the
compiler now catches the third one. It immediately proved itself: making `sourceRoot` required
produced four errors in `dispatch.test.ts`, which is precisely the feedback the previous two bugs
never generated.

## Review notes

- **No tool-surface change.** No tool added, renamed or re-signatured, so `plugin:check`'s count
  is untouched at 24. The bundle was rebuilt regardless, because core compiles into it
  (AGENTS.md §8 gotcha 8).
- **`--repo-root` is additive and optional.** Omitting it is the normal case.
- **Registered command lines change** for board-worktree projects, but only on the next connect.
  The derivation tier covers the interim, so this is an improvement in precision rather than a
  migration users must perform.
- Worth a reviewer's eye: `deriveRepoRoot` is intentionally narrow — path-shape only, no git, no
  directory probing. It matches the one shape Kanmer itself creates and returns null otherwise.
