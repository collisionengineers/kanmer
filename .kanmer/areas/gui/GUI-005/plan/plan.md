# Plan

Written mid-implementation: `readOnly.ts`, the `ipc.ts` type and the
`main/index.ts` switch were already done when this was written. The App.tsx
work below is still ahead of it.

**Banner condition becomes `format < 3`.** Today it is `format === 1`, so no
existing v2 user is offered v3 at all. The wording differs per format — a v1
board is told it gets folders and areas as well as stages.

**One migrate call, three reports.** `migrateBoard` already chains v1→v2 →
backfill → v3 and threads `dryRun`. The modal renders the v2 section only when
`!v2.alreadyV2`, so a v2→v3 user sees just the v3 half.

**Blockers disable, `needsRestage` does not.** Blockers are things that must be
fixed by hand; `needsRestage` means "these tickets land in Backlog and get a
label". That is a decision, not an error, so it is listed in full — a count
alone can be clicked past.

**`prioritiesStripped` gets its own line.** It is the only number that means
data is being deleted.

**Read-only on decline, enforced at the client.** `readOnlyClient` wraps the
bound `ProjectClient` and rejects the 14 write methods. Per-component checks
would need every future component to remember the rule; the client is the only
path a component has to IPC.

`migrate`, `backfillBoard` and `getFormat` stay open — blocking the exit from
read-only would be a trap. `dispatchAgent` is blocked despite writing nothing
itself, because it hands an agent a board to edit.

This is a UI guard, not a boundary. Core still validates, and MCP does not pass
through here.

**On success set format to 3 and refresh.** The existing partial-migration error
message stays as-is: it tells the user not to delete the legacy folders, which
is the intuitive move that actually loses tickets.
