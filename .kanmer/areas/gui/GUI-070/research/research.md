# Research — GUI-070: Remove the separate Backlog view

*Read-only investigation. No code changed, no branch, no worktree.*

## The operator decision (binding)

Recorded by the operator in `scratch/notes.md` on 2026-08-16, quoted verbatim
because it settles the fork the ticket body demanded and everything below is
scoped by it:

> **Operator decision, 2026-08-16 — option 1: accept the loss.**
>
> Asked as the ticket demanded ("pick one deliberately"), with the cost stated:
> multi-select and bulk move / archive / add-to-group go away with `BacklogTable`.
>
> Chosen anyway. So:
>
> - [[GUI-069]] makes Backlog a **plain** first column — no multi-select, no
>   context-menu bulk actions ported over.
> - This ticket deletes the tab, the `BacklogTable` branch, `BacklogTable.tsx` and
>   `windowedRows.ts` if nothing else uses them.
> - FRD-011 is amended, not silently contradicted. Its R5 ("the board's Backlog
>   column disappears from the kanban") is **reversed**, and R1/R3/R4/R6 — the
>   table, its bulk actions, the horizon chips, the keyboard grid — describe a
>   view that will no longer exist. The amendment has to say the capability was
>   weighed and dropped, not pretend it moved somewhere.
>
> Recorded here because the reasoning is what review checks, and a decision that
> only exists in a chat transcript is not recorded.

So: **option 1, no capability port, FRD-011 amended in place.** Any plan that
ports multi-select or bulk actions onto the board is out of contract with this.

## Question

Where does the standalone Backlog view live in `apps/gui/src/renderer/`, what
does deleting it touch beyond that folder, and what does the deletion owe the
governing documents that describe the view?

## Assumption this research makes explicit

**GUI-069 has already landed.** It is a stored `blocks` edge (`get_links GUI-070`
→ `blockedBy: GUI-069`), and the reason is not cosmetic: today `Board.tsx:115-119`
does `STAGES.filter((s) => s.id !== "backlog")`, so backlog tickets only reach
the board through `mergeColumns`' unknown-status fallback (appended last, drawn
as a raw id). Deleting the view before GUI-069 lands leaves the *only* first-class
route to a backlog ticket being an accidental fallback column. Concretely, this
research assumes GUI-069 has:

- removed the `!== "backlog"` filter in `Board.tsx` so Backlog is a real,
  styled first column from `STAGES`;
- fixed `mergeColumns` so it distinguishes "unknown status" from "known status,
  deliberately hidden";
- rewritten the FRD-011-citing comment at `Board.tsx:116-118` (see the boundary
  question in `open-questions`).

If GUI-069's final shape differs — e.g. it keeps Backlog hidden behind a toggle —
this ticket's scope changes and the research must be revisited before planning.

## Findings

- **The view is four lines of `App.tsx` plus one component.** `App.tsx:49` types
  `View = "ticket" | "backlog" | "standup" | "archived"`, `:51-56` gives each a
  label, `:35` imports `BacklogTable`, and `:1184-1211` is the render branch —
  the branch also carries the four handlers (`onMove`, `onArchive`,
  `onAddToGroup`, `groups`) that only this view uses.
- **The Ctrl+N view shortcut really is derived and will absorb the removal.**
  `App.tsx:929-940` does `Object.keys(VIEW_LABELS)` and indexes by digit; the
  in-code comment says the old parallel array `["ticket","standup","archived"]`
  "went stale the moment the Backlog view was added". Dropping the key
  automatically renumbers Ctrl+1/2/3 to Board/Standup/Archived with no gap. The
  ticket asked for this to be *verified* rather than assumed — verified by
  reading; it still needs a runtime check because there is no test over the
  handler (see next finding).
- **The keyboard handler is not covered by a test, by design and on the record.**
  `apps/gui/src/shared/shortcuts.ts:1-13` states plainly that the manual test
  "proves the chapter matches this table — it does not prove the handler in
  `App.tsx` matches it, because the handler is still an `if/else` chain". So the
  Ctrl+1…3 renumbering has no automated safety net; it is a manual check.
- **The nav tab strip is shared with GUI-071 at line-level granularity.**
  `App.tsx:1058-1074` renders the tabs from `VIEW_LABELS` and, inside the same
  `.map()`, computes the count with the single shared expression GUI-071 exists
  to fix. GUI-070 removes a key from the object the loop reads; GUI-071 rewrites
  the body of that loop. Same JSX block, adjacent lines — a guaranteed conflict
  if worked in parallel.
- **There is no persisted view state to migrate.** `SavedTabState.view`
  (`App.tsx:82-87`) lives in a `useRef<Map>` (`:94`), written on tab switch
  (`:202-207`) and read back at `:221-222`, and deleted on tab close (`:237`).
  Nothing writes it to disk — `main/settings.ts` and `shared/ipc.ts` have no view
  preference. So no user can be stranded on a removed view after upgrade, and no
  migration or fallback is required.
- **The command palette never had a "Go to Backlog" entry.** `App.tsx:1013-1015`
  offers Board / Standup / Archived only. Nothing to remove there; worth stating
  so a reviewer does not go looking.
- **`BacklogTable.tsx` is self-contained (257 lines) and its only dependency is
  `lib/windowedRows.ts`.** A repo-wide grep for `windowedRows` finds exactly
  three consumers: `BacklogTable.tsx:3`, its own test
  `lib/windowedRows.test.ts`, and nothing else. `Board.tsx` does no windowing.
  So both files die with the view, and `windowedRows.test.ts` (a ~110-line
  suite, including property-ish loops) goes with them.
- **There is no `BacklogTable` component test.** `apps/gui` runs vitest with no
  jsdom/testing-library dependency (`apps/gui/package.json`), so no rendering
  test exists to delete. The only test that *breaks* is `manual.test.ts:55-63`,
  which hard-codes `["Board", "Backlog", "Standup", "Archived"]` and asserts each
  appears in the Ctrl+1…4 shortcut label.
- **`@kanmer/ui` re-exports the component and will fail to typecheck/build.**
  `packages/ui/src/index.ts:17-18` exports `BacklogTable` and `BacklogTableProps`
  straight out of the GUI source tree. `packages/ui` is a real, now-tracked
  workspace under `workspaces: ["packages/*", "apps/*"]`, and AGENTS.md §10 item 3
  insists on the whole-repo `npm run typecheck`. Deleting the component without
  editing that file breaks `npm run typecheck` and `npm run build:ui`.
  Reassuringly, `packages/ui/docs/components/` has **no** `BacklogTable.md`, and
  `.design-sync/previews/` has no BacklogTable preview — so the design-system
  surface is those two export lines and nothing more.
- **The in-app manual is generated from the FRD being amended.**
  `scripts/build-manual.mjs:35` lists `["backlog", "The Backlog list",
  "FRD-011-backlog-list-view.md"]` in `FROM_FRD`; the generator reads the FRD's
  lead prose, and it **throws** if the FRD file is missing (`:64`) or if its lead
  prose is empty (`:66`). `chapters.generated.ts` is a **committed** artifact and
  `npm run check:manual` fails when it is stale. Consequences: (a) the chapter
  entry must be removed or the app keeps a manual chapter describing a deleted
  view; (b) FRD-011 must be *amended in place, not deleted* — deleting the file
  breaks the build script; (c) `npm run build:manual` must be re-run and the
  regenerated file committed.
- **The hand-written manual chapter asserts the deleted design.**
  `docs/manual/getting-started.md:11-12`: "Backlog is a list rather than a
  column, because a long queue is something you scan and triage, not something
  you look at all at once." That is the FRD-011 argument in user-facing prose and
  it feeds `chapters.generated.ts` chapter 0.
- **Four more documents carry the claim.** `FRD-019-gui-shell.md:14` (R5 lists
  Backlog among the views), `FRD-007-fixed-six-stage-board.md:28` (B4: "the
  kanban renders Preparing → Done; Backlog renders as the dedicated list view"),
  `FRD-001-groups.md:27` (G8 cites FRD-011 for the group-chip surface), and
  `PRD-001-kanmer-v3.md:16,25,30` (problem 6, "a backlog view built for volume",
  "the backlog is triaged in the list view"). FRD-007 B4 is arguably GUI-069's to
  reverse; the rest are this ticket's or open questions.
- **Two source comments cite FRD-011 R4 for a feature that survives.**
  `FilterBar.tsx:5` and `App.tsx:1726` attribute the horizon/group chips to
  "FRD-001 G8, FRD-011 R4". The chips live in the FilterBar, which renders only
  when `view === "ticket"` (`App.tsx:1149`) — i.e. they are already a *board*
  feature and are unaffected. Only the citation goes stale.
- **`apps/gui/release-notes.md:155` describes the shipped Backlog view.** It is
  release history for an already-shipped version. Historical records are not
  amended retroactively; noting it so nobody "fixes" it.
- **Build outputs that mention the view are gitignored.**
  `apps/gui/out/renderer/assets/*.css` (`.gitignore:15`) and `packages/ui/dist/`
  (`.gitignore:2`) both contain BacklogTable traces and regenerate on build. No
  action.

## Implications

1. **Scope is small in code, real in docs.** Roughly five source edits and four
   deletions; the larger half of the ticket is the documentation reversal, which
   the ticket correctly refuses to leave implicit.
2. **FRD-011 must be amended in place, not deleted or superseded by removal.**
   Two independent forces say so: `build-manual.mjs` throws on a missing FRD, and
   the operator's note requires the amendment to "say the capability was weighed
   and dropped, not pretend it moved somewhere". The repo has no `superseded`
   precedent — every FRD is `status: draft` or `approved` — so the status value
   itself is an open question (see `open-questions`). `FRD-014-doc-type-guidance.md:15`
   states the convention that *ADRs* are superseded and never edited, which by
   contrast supports editing the FRD.
3. **The manual is a build artifact with a check gate.** Any plan that edits
   FRD-011 or `shortcuts.ts` and does not run `npm run build:manual` ships a
   stale committed file that `npm run check:manual` will fail on.
4. **`@kanmer/ui` is the non-obvious breakage.** It is the one consumer outside
   `apps/gui/` and it is invisible from the renderer folder the ticket points at.
5. **Sequencing with GUI-071 must be decided, not discovered.** They edit the
   same JSX block. Landing GUI-070 first shrinks GUI-071 (one fewer tab to give a
   count) and voids GUI-071's first verification criterion; landing GUI-071 first
   makes it write a per-view count for a view GUI-070 then deletes. Recommended
   order: GUI-069 → GUI-070 → GUI-071.
6. **Verification is mostly manual.** No test covers the keyboard handler or the
   nav, so the ticket's "view shortcuts still map to the right views with no gap"
   criterion is a GUI boot check (AGENTS.md §10 item 5), not a unit test.

## Open questions

Recorded in full, one per checkbox, in the `open-questions` document.
