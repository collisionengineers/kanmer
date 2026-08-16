# Research — the board root / repo root split

## The defect

`assertRefs` (`packages/core/src/store.ts`) validated each governing-doc path against
`this.paths.projectRoot`. For every consumer that root is where `.kanmer/` lives — which, on the
shipped board-worktree model (FRD-020 R1), is `<repo>/.worktrees/kanmer`. Governing documents
live in the source checkout. So the two never met.

Reproduced live before the fix:

    create_item(refs: ["docs/functional/frd/FRD-002-requirement-profiles.md"])
    -> Referenced document "..." does not exist under the project root.

## Why it mattered more than it looked

FRD-002 P4 makes a non-empty `refs` one of only two ways past the leave-Backlog governing-doc
gate. FRD-020 makes the worktree the normal setup. Together: on a normal board the gate could
only ever be satisfied by `docs_todo: true` — the "I'll write it later" escape hatch. The gate
was still *enforced*, so it never looked broken; it just quietly stopped being able to mean what
it was for.

The GUI was already internally inconsistent: `openRepoDoc`, `getRepoDoc` and `pickRepoDoc`
(`apps/gui/src/main/index.ts:681,685,691`) all resolve against `sourceRoot`, so its own document
picker produced paths that its own store then refused.

## The sweep

Swept every root use, looking for siblings (full notes in `scratch-root-split-sweep.md`).

- **Core: this was the only one.** Every other `projectRoot` use — `resolvePaths`, the store
  constructor, `watchKanmer` — correctly means "where `.kanmer/` lives".
- **`repoDocKindOf`/`repoDocsMap` never touch the filesystem** (`docs.ts:80-109`); they glob
  against the ref string. So classification was already root-independent and fixing `assertRefs`
  was sufficient for the whole gate to work.
- **The GUI had no other live bug** — connect, skills, dispatch and the repo-doc channels all
  pass `sourceRoot` explicitly.
- **Two latent traps**, both defaulted parameters resolving to the wrong root:
  `dispatch.ts` defaulted `sourceRoot` to `store.paths.projectRoot` (the board), and
  `connect.ts` defaulted `boardRoot` to `projectRoot` (the source). Each had exactly one caller,
  which passed explicitly — unreachable, but silent when reached.

## How this class of bug happens here

It is the same shape as the watcher bug fixed in the pre-work. Commit `b36087f` introduced the
board worktree: it repointed `store` to `boardRoot` and left `projectId` meaning the source root.
No line had to be *edited* to become wrong — a variable kept its name and value while its role
bifurcated. Both survivors (`watchKanmer(projectId, …)`, `assertRefs(projectRoot)`) read as
correct at the call site and failed silently.

The generalisable lesson, applied in the fix: make the two roots **explicit and required** rather
than defaulted, so the compiler is the thing that notices next time.

## Prior art in the codebase

`assertSafeRepoPath` already takes its root as a parameter rather than reading one, so the
traversal guard was fine — only the root handed to it was wrong.
