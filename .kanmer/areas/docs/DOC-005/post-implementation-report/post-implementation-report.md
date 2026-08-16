# Post-implementation report

PR [#26](https://github.com/collisionengineers/kanmer/pull/26). The last ticket
of the v3 roadmap.

## File changes

| Path | Change |
|---|---|
| `AGENTS.md` | §0, the operating rule — outside the managed block. |
| `docs/README.md` | The same rule with reasoning and the evidence table. |
| `scripts/release-notes.mjs` | **New** — the stretch. |
| `package.json` | `release:notes`. |

## Against the governing docs

**ADR-0010** — setup is reconciliation and the board reflects reality; the
operating rule is the human-facing half of that.

## The decision that shaped this ticket

Writing "Kanmer's own work goes through Kanmer" as an unqualified claim would
have been false and checkable-as-false in the same commit — 60 backfilled
tickets and 26 closed by a collapsed move are right there on the board.

So both documents carry the counts. The rule is stated with when it became
enforceable and what preceded it. That also makes it useful: a reader opening a
15 August ticket with no stage history now knows why, instead of concluding the
process is decoration.

## The stretch earned its place

`release-notes.mjs` is the first consumer of `stageEntered`. Until now that
field was recorded and read by nothing — a process that only demands things gets
followed less reliably than one that produces something.

## A root-confusion bug, caught by using the thing

The first version resolved the board from the script's own root, which is wrong
whenever it runs from a per-ticket worktree — the normal case. `git rev-parse
--git-common-dir` fixes it.

This is the third instance of the same class in this project (the GUI watcher
rooted at the source tree; `assertRefs` in CORE-001). It was caught here only
because the script was run from a worktree rather than the main checkout, which
is an argument for running things where they will be used rather than where they
are convenient.

## For review

**The counts are a snapshot.** "60 backfilled, 26 collapsed" is true today and
will drift as the board grows. Nothing regenerates them. A script could, but a
generated paragraph in AGENTS.md is a new artifact to keep in sync — I judged a
dated statement of fact better than a live one, and that is arguable.

**Nobody has followed the rule from a cold start.** It describes what the last
sixteen tickets did, written by the same agent that did them. Whether it reads
clearly to someone arriving without that context is untested.

**`release:notes` is not wired into `release.mjs`.** It prints; the release
script does not call it. Deliberate — notes need editing — but it does mean
remembering to run it.

## What kanmer-verify should run

`verify:agents-block`; `node scripts/release-notes.mjs` from both the main
checkout and a worktree, confirming both find the board; confirm AGENTS.md §0
sits outside the markers; full suite.
