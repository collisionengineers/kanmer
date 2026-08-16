## The board is empty, or a ticket will not open

Check the project you opened is the one holding `.kanmer/`. In a Git repository
the board lives in `.worktrees/kanmer` on its own branch — Kanmer finds it for
you, but a folder opened by hand may not be it.

## A move is refused

Two different refusals, and the message distinguishes them.

**"requires \<document\>"** — the ticket's profile asks for something that is not
written yet. Write it, or change the profile if the work is smaller than the
profile assumes.

**"crosses N document gates"** — the jump is too big. A move crosses one gated
boundary at a time; the message names the next stage to move to. Every document
existing does not make the jump legal, because the stages are meant to be walked.

## An attachment does not satisfy a gate

It never will. Files under `reference/` are inputs to the work — a mockup, a
spec, a log — and `scratch/` is a notepad. Neither can satisfy a requirement.
Pipeline documents go in their own folders.

## An agent cannot see the board

Reconnect it in **Settings → Connect**. If the agent runs its own MCP server
process, it holds the version it started with — restart it after updating
Kanmer, or it keeps reading the board with the old code.

## Automatic sync is not syncing

Check **Settings → Git**: sync is off unless an interval is set. If a sync
conflicts it pauses and keeps your local work rather than resolving it for you;
the error says what happened and the button becomes **Retry**.

## Renaming the board branch

Do it from **Settings → Git**, not from the command line. Renaming there moves
the existing branch and pushes it before deleting the old one, so no history is
stranded. Projects that were closed at the time are migrated the next time they
open.
