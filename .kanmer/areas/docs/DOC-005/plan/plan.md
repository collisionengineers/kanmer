# Plan

## Two audiences, two registers

**AGENTS.md** — imperative and short, outside the managed markers:

- file the ticket before the branch
- one worktree and one branch per ticket, recorded by `take_ticket`
- the PR names the ticket id
- gates are not optional here, including for Kanmer's own work

**`docs/README.md`** — the same rule with the reasoning, plus what the board
actually demonstrates and what it does not.

## State the history honestly

The rule is stated with its start date and what preceded it. A rule written as
"we always do this" is refuted by this repo's own board — 26 tickets closed by a
single collapsed move — and a refuted rule gets ignored. Written as "here is the
rule, here is when it became enforceable, here is what came before and why it
is still on the board", it survives being checked.

That also makes the entry useful: someone reading a 2026-08-15 ticket with no
stage history now knows why, instead of concluding the process is decorative.

## The stretch, because it earns its place

`scripts/release-notes.mjs` groups tickets whose `stageEntered.done` falls after
the last tag's date, by area, with ids, titles and PR links.

It is worth building beyond "the ticket said stretch": it is the first thing
that makes the recorded stage history *useful* rather than merely present, and a
process that produces something is followed more reliably than one that only
demands things.

Read-only — prints to stdout, writes nothing. Release notes are edited by a
human before shipping, and a script that wrote them directly would invite
shipping the raw dump.

## Verification

`verify:agents-block` still passes (the rule is outside the markers); the notes
script runs against this repo and produces the tickets closed today; both
documents state the same rule.
