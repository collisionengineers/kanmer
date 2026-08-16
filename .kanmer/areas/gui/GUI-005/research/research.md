# The format-3 migration prompt — research

## What the app does today

The prompt exists, but it stops one format short. `App.tsx` shows its banner on
`format === 1` and the modal calls `client.migrate()`, which reaches
`migrateToV2` in the main process. Core has had the umbrella `migrateBoard`
(v1→v2, then stage backfill, then v→3) since 2.6, and nothing in the GUI calls
it. So a user on a format-2 board — which is *every* existing Kanmer user — sees
no banner at all and has no in-app route to v3.

That is the actual bug. Not a missing modal: a modal wired to the wrong function.

## The state a v2 board is in under a v3 app

Worth being precise, because it determines how the decline path has to behave.

Format 3 removed `statuses` from the board config and replaced it with six fixed
stages. A format-2 board still carries its own `statuses` list, which may be
seven stages, or four custom ones. The renderer draws the fixed six regardless —
`shared/stages.ts` is a constant. So an unmigrated board renders *approximately*:
tickets whose status happens to match a fixed stage land in the right column,
and the rest fall into `mergeColumns`' fallback columns.

Reads are therefore useful. Writes are not. `assertStage` validates against the
fixed six, so a move to a legacy stage is rejected by core with a real error —
but an `update_item` that touches other fields still writes a format-3-shaped
file into a format-2 board. Half the operations fail confusingly and the other
half quietly mix formats.

That is why FRD-007 M3 says declining leaves *read-only* compat. Not a courtesy:
it is the only coherent state between "still v2" and "migrated".

## Where the read-only line should be drawn

Per-component checks would work and would rot. There are a dozen mutation
affordances today across Board, Editor, Settings and GroupView, and the next
component someone adds has no reason to know the rule exists.

The chokepoint is `lib/client.ts`. Every renderer write goes through the bound
`ProjectClient` — components cannot reach `window.kanmer` directly because they
receive the client from context. Wrapping that one object catches everything,
including code not yet written.

The list of blocked methods needs thought rather than pattern-matching on names.
`takeTicket` writes an assignee. `dispatchAgent` does not write anything itself
but hands an agent a board it is expected to edit, which is worse. `setGroupDoc`
writes outside the ticket tree. Meanwhile `migrate` and `backfillBoard` must
stay open — blocking the way out of read-only would be a trap.

This is the app guarding its own UI, not a security boundary. Core remains the
authority, and an MCP server never passes through this path.

## What the modal has to show

FRD-007 acceptance 6 wants the preview to be specific enough to decide on.
`V3Report` already carries exactly the right five things, which is a sign 2.6
designed the report for this screen:

- `stageMapping` — old status → new stage with counts, so the collapse is legible
- `needsRestage` — the tickets whose status had no alias, which is the one
  outcome a user might refuse over
- `docMoves` — loose documents relocating into type folders
- `prioritiesStripped` — a count of data being *removed*, which must not be
  buried
- `profileAssignments` — how many tickets got which profile

`needsRestage` deserves the strongest treatment. It is not a blocker — those go
in `blockers` and disable the button — but it is the only entry that means
"tickets will end up somewhere you did not put them". A count alone would let
someone click through it.

## One more thing the existing modal gets right

The failure handler tells the user *not* to delete the legacy folders and to run
migrate again. That wording exists because the destructive workaround is the
intuitive one and it is the thing that actually loses tickets. Whatever this
ticket changes, that message stays.
