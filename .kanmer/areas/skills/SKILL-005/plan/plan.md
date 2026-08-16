# Plan

## Shape

Replace the pipeline description with a pointer. The block stops saying what
documents a ticket needs — it cannot know, since that is per profile — and says
to ask `get_doc_gates` instead. Everything else is orientation an agent cannot
discover by calling a tool.

Kept: where the board lives, the six stages, the worktree/branch convention,
scratch-is-not-a-document, archive-don't-delete, `[[ID]]` links, the roster.

Added: profiles exist and requirements vary per ticket; one gated boundary per
move; read the whole ticket folder and the group's `context.md`.

Removed: the seven-stage list, the fixed document pipeline, the
leave-Backlog-needs-a-governing-doc rule stated unconditionally, `-import`.

## Both copies, one commit

`BLOCK_BODY` and the skill's fenced copy are edited together. `verify:agents-block`
is run before committing, not after — it is the only thing that catches a
one-sided edit, and a one-sided edit is the single most likely mistake here.

## Regenerate this repo's own AGENTS.md

The script owns the block, so the repo's `AGENTS.md` is updated by *running*
it rather than by hand. That also exercises the script's idempotent-refresh
path against a real file with content outside the markers, which is the
behaviour most likely to be broken by a body change.

## Verification

- `verify:agents-block` — 26/26, including the byte-identity check
- run the script twice; the second run changes nothing
- `git diff AGENTS.md` touches only the marked region
- the block names no stage outside the six, and no deleted skill
