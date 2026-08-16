# Plan — fixed columns and the Board-settings shrink

Landed alongside Phase 2 rather than after it, because the renderer stopped
compiling the moment `statuses` left `BoardConfig`. Splitting it out would have
meant an intermediate commit with a broken GUI.

**Columns from constants.** `Board.tsx` derives its columns from `STAGES`
instead of `board.statuses`. `mergeColumns` is *kept*: it appends a fallback
column for any stage id found on an item but absent from the set. That still
earns its place — on an unmigrated board a ticket sitting in `researching`
would otherwise vanish from the UI entirely, which is a far worse way to learn
you have not migrated than seeing an extra column.

**The renderer cannot import core at runtime** (AGENTS.md §7 — core pulls in
gray-matter and chokidar). The constants therefore live in
`shared/stages.ts` as a mirror, with `shared/stages.test.ts` asserting it
matches core. That test is the improvement over the repo's two existing
core/renderer duplications, which have nothing stopping them drifting.

**Settings Board tab** loses the stage and priority editors, keeping areas, and
gains a line explaining that the six are fixed and why — a user who came looking
for the stage editor deserves the reason, not just its absence.

Deferred to GUI-015 (5.3): the Backlog column leaving the kanban. It stays a
plain column until the list view exists to replace it, because removing it first
would leave new tickets with nowhere visible to land.
