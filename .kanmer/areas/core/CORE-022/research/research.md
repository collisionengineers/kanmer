# Why the migration cannot survive an ordinary Windows condition

Measured against the failing board, not reasoned about.

## The board is not the problem

242 tickets. **194 cleanly format 3, 48 cleanly format 2**, and nothing in
between — no torn frontmatter, no duplicate ids, no empty directories, no
legacy `tickets/`/`plans/`/`research/` at the root. `version.json` is still
`{format: 2}`, so a re-run correctly re-enters.

Two hypotheses ruled out:

- **Path length.** Longest absolute path 169 chars; the failing one 137. Nothing
  near `MAX_PATH`.
- **Unmappable stages.** Only one status outside the fixed six is in use —
  `todo`, on 47 tickets — and `STAGE_ALIASES` maps it to `backlog`. Zero tickets
  would land in `needs-restage`.

## What actually happened, reconstructed

`tmpCounter()` (`io.ts:91-95`) is a monotonic module global, so the temp
filenames order the writes within one process. All three ticket temps carry
pid 18292:

| Attempt | Counter | Died at |
|---|---|---|
| 1 | 182 | TICK-162 |
| 2 | 183–377 | TICK-176 |
| 3 | 378–383 | SIMPLI-001 |

**The reported ticket is a red herring.** TICK-162 is fully migrated — its
leftover temp is byte-identical to the live file. Attempt 2 got past it and
died 195 writes later. Attempt 3 died after **five**.

It degrades because a retry restarts. And it is chronic, not incidental: two
further temps are from **pid 23812, a day earlier** — the v1→v2 migration hit
the same EPERM. Five failures, two processes, two days, one path.

## Six defects

**1. `writeFileAtomic` has no retry** (`io.ts:47-54`). Four statements, no
`try`. An `EPERM` from `fs.rename` propagates verbatim.

**2. It leaks the temp on failure.** No `finally`. `writeFileExclusive`
(`io.ts:64-81`) has one *and* an explicit EPERM fallback for `fs.link`. The
asymmetry is the bug: the codebase already knows both failure modes and the
atomic-write path has neither.

**3. `migrateToV3` has no per-ticket resume.** Its only idempotence gate is a
whole-board `detectFormat() === 3` early return (`migrate.ts:561-564`). The doc
*moves* are check-before-act (`:641`, `:648`); the ticket **rewrite** at `:662`
is unconditional.

**4. So retries restart rather than converge.** `version.json` is written last
(`:682`), so after a failure the board still reads format 2 and every ticket is
rewritten again. Attempt 4 on this board would rewrite 194 already-correct
tickets before reaching the one that failed.

Worth stating precisely: the re-write is *content*-idempotent — a second run
produces byte-identical output, which is why nothing corrupted. It is not
*I/O*-idempotent, which is why nothing converges.

**5. The migrate handler never calls `markOwnWrite`**
(`apps/gui/src/main/index.ts:639-641`). Every ticket the migration writes is
therefore treated as an external agent change: the renderer calls `getItem`
(`App.tsx:374`) and the toast builder calls `getItem` again (`index.ts:387-397`).
Two `readFile`s per ticket, on the files being written, in the same process.

**6. Neither the watcher nor git sync is paused.** `watchKanmer` runs over
`.kanmer` for the whole migration (`index.ts:432-444`), closed only by
`closeProject` and `will-quit`. The auto-sync timer keeps firing
`git add -- .kanmer` (`kanmerGit.ts:169`), which opens every ticket file to
hash it.

## This was predicted, in this repo

`docs/plans/pr-2-review/pr-2-comments.md:2216`:

> A user whose migration is interrupted — crash, kill, power loss, or a single
> `EPERM` from antivirus mid-rename — has a board that cannot be migrated by any
> action available in the product…

and `:2199-2210` diagnoses a terminal `writeVersion` plus a whole-board format
check as "structurally incapable of seeing a half-migrated board". That review
fixed v1→v2. **`migrateToV3`, written later, reproduced the exact shape it
condemned.**

A correction to an earlier claim of mine: `migrateToV2` is *not* "EPERM-aware"
in the sense of retrying. There is no retry anywhere in the repo. What v2 has is
check-before-act resumability — recovery *after* the throw, not survival *of*
it. Believing otherwise is plausibly why v3 shipped without either.

## What the docs claim

`FRD-007` M4: *"Idempotent: re-running on a format-3 board is a no-op; a
partially-applied migration resumes safely."* The first clause is true; the
second is false for v3, and is the clause a user in this situation relies on.

## Where the leaked temps do and do not matter

Inert for reads: doc scans filter to `.md` (`docpaths.ts:102,134`) and item
discovery looks for `<folder>/<folder>.md` (`store.ts:421-423`), so
`.TICK-162.md.tmp-18292-182` is invisible to both. The watcher ignores them too
(`watch.ts:26`).

They are **not** gitignored. `ensureIgnore` on the board worktree adds only
`activity.jsonl` (`kanmerGit.ts:146`), so `git add -- .kanmer` on the sync timer
would commit them.
