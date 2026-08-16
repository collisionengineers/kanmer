# Proof

PR [#28](https://github.com/collisionengineers/kanmer/pull/28), merged to `main`.
Verified on merged main.

## Against the board that actually failed

A copy of the real 242-ticket board, in a temp directory — read-only with
respect to the original:

```
BEFORE   format 2 · 194 migrated / 48 not · 5 stray temps
RUN 1    resumed: true · swept 5 temps · needsRestage 0 · blockers 0
         stageMapping: todo→backlog 47, backlog 166, implementing 15,
                       done 13, review 1
AFTER    format 3 · 242/242 migrated · 0 stray temps
         already-migrated tickets rewritten: 0 of 194
RUN 2    alreadyV3: true
```

**`0 of 194` is the claim this ticket exists to make.** Before the fix, a
re-run rewrote every ticket and took a fresh chance of EPERM on each; that is
why the three real attempts died at write #182, #377 and #383, each earlier
than the last. It now does only the 48 tickets left.

The run completed on data the product had failed on three times.

## Unit coverage of what the fixture cannot reach

`io.test.ts` (new — `io.ts` had no tests):

- an injected rename failing `EPERM` twice then succeeding → 3 attempts
- each of `EPERM`, `EBUSY`, `EACCES` retried
- `ENOSPC` fails on the **first** attempt — the deliberate non-retry
- exhaustion bounded at 6 attempts, so a migration cannot hang on one file
- the original error object is rethrown, not a wrapper
- **no temp file left after a permanent failure** — the defect that littered
  the real board
- a rename that fails once then succeeds still persists the content

The three exhaustion/backoff tests each take ~575 ms, which is the 545 ms of
real sleeps: the backoff is running, not mocked away.

`migrate.test.ts`: a re-run rewrites **zero** ticket files (mtimes compared),
reports `resumed`; a rolled-back ticket is still finished; a stale temp is swept
while one younger than 60 s is left alone.

## Rail on merged main

core **139 → 154**, gui 184, `smoke.mjs` 120/120, `smoke:protocol` 26/26,
typecheck, GUI build, boot exit 0, `plugin:build` + `plugin:check` (29 tools,
bytes match).

## Not proven

**The GUI pause is verified by reading only.** There is no main-process test
harness for `CH.migrate`. The pause/restore typechecks and the `finally` is
there, but nothing exercises it. The failure I would most want caught is
`startWatch` itself throwing inside the `finally` — the context would keep a
closed watcher and live sync would be dead for the rest of the session.

**The retry is proven against an injected error, not a real lock.** Contriving
genuine handle contention cross-platform is unreliable, which is why the seam
exists. What is proven is the policy; what is assumed is that Windows raises
one of the three codes. That assumption comes from the actual error message on
the actual board, so it is evidence rather than a guess — but it is one
observation.

**The affected board is untouched.** This ticket deliberately did not repair it.
It remains half-migrated and read-only until that is run separately — and the
fixture shows exactly what will happen when it is.
