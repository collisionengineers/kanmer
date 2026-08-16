# Plan

Four changes. The first two make a retry possible; the third makes it converge;
the fourth stops the app competing with itself.

## 1. `writeFileAtomic` retries, and never leaks

```ts
const RENAME_RETRY_MS = [10, 25, 60, 150, 300];
```

Retry **only** `EPERM`, `EBUSY`, `EACCES` — the codes Windows raises when a
handle blocks a replace. Anything else throws on the first attempt: a loop that
swallows `ENOSPC` is worse than no loop, because it turns a clear failure into a
slow one.

~545 ms worst case, and **zero cost on the success path** — this function is on
every board write, not just migration, so the happy path must stay a single
`rename`.

The temp is removed in a `finally`, matching `writeFileExclusive:79-80`. A
failed write leaves no residue, which is the difference between a board with 5
stray files and one with none.

The rename is injectable (defaulted to `fs.rename`) purely so the retry can be
tested without contriving a real lock. That is a seam for testing and is
documented as such.

**Not doing:** retrying `fs.writeFile` of the temp. It writes to a name nothing
else knows, so contention there is not the failure mode observed.

## 2. `migrateToV3` skips what is already migrated

Before the rewrite at `:662`:

```
already = item.profile !== undefined && priority is absent
```

If so, skip the write, set `resumed`. The doc-move loops above are untouched —
they already check before acting.

`V3Report` gains `resumed` so the report stops presenting a resumed run as a
fresh one, mirroring `migrateToV2:354-358`.

**Why this predicate and not `detectFormat`:** the format stamp is whole-board
and written last, deliberately (`:682`) — moving it earlier would mark a
half-migrated board as done. The per-ticket question has to be answered from the
ticket.

This is the change that turns "attempt 4 rewrites 194 correct tickets" into
"attempt 4 writes 48".

## 3. Sweep stale temps

Under `.kanmer`, remove files matching the atomic-write pattern that are
**older than 60 s** — never a concurrent writer's in-flight temp. Count them in
the report.

Also extend `ensureIgnore` (`kanmerGit.ts:146`) to cover the pattern, so the
sync timer stops being able to commit them.

## 4. The GUI stops fighting the migration

`CH.migrate` closes the watcher and clears `syncTimer`, runs, then restores both
in a `finally` — **including on the throw path**, or a failed migration silently
kills live sync for the rest of the session. That is the failure this change
must not introduce while fixing another.

This removes the two `getItem` reads per ticket that the missing `markOwnWrite`
was causing, and stops `git add` walking the tree mid-loop. `markOwnWrite` then
becomes unnecessary for migration: with no watcher running there is no event to
suppress.

## Sequencing

1 and 2 are independent and land together; they are the fix. 3 and 4 are
hardening and could be split, but 4 is what makes the retry rarely needed rather
than routinely needed, so it belongs here.

## Verification

The real test is the failing data. Copy the affected board to a temp directory
and run the fixed migration over all 242 tickets: it completes, 48 migrate, the
194 already done are **not rewritten**, `todo → backlog` × 47, zero
`needs-restage`, 5 temps swept, `version.json` → 3. Then run again for a clean
no-op.

Unit tests cover what the fixture cannot: an injected `EPERM` that clears on the
third attempt, a non-transient code failing immediately, and the temp being gone
after a permanent failure.
