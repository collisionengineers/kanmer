## OPERATOR + SCHEDULER ANSWERS — 2026-08-16

**Q "Who amends FRD-007 B4?" — SCHEDULER: GUI-070 owns it, entirely.**
GUI-069 amends no FRD. B4 is one sentence whose both halves reverse, so splitting
it means two branches editing the same line. You land second and can state the
finished position in one edit. You therefore own **FRD-007 B4 and every FRD-011
edit**. GUI-069's plan names you as the ticket that corrects the temporary
falsehood — make sure you actually do.

**Q "Does PRD-001 get amended?" — OPERATOR: YES.**

**Q "What status does an amended-into-obsolescence FRD carry?" — OPERATOR:
`status: withdrawn`, plus an amendment section.** The operator chose the option
that sets the precedent explicitly, knowing there is no prior `withdrawn` or
`superseded` FRD in this repo. So write it as a precedent someone will copy:

- `docs/functional/frd/FRD-011-backlog-list-view.md` → `status: withdrawn`, plus
  an `## Amendment (GUI-070)` section that **reverses R5** and marks R1/R3/R4/R6
  withdrawn.
- The amendment must **record that bulk triage was weighed and dropped, not
  relocated.** That is the operator's earlier binding decision — multi-select and
  bulk move/archive/add-to-group go away with `BacklogTable`, and GUI-069's
  Backlog column is deliberately plain. Do not write it as though the capability
  moved somewhere.
- `docs/product/prd/PRD-001-kanmer-v3.md` → a **dated note under problem 6**
  ("a 194-card Backlog column is a list problem wearing a kanban costume"),
  recording that the list view was built, shipped, and withdrawn in favour of a
  Backlog column, with the bulk-triage loss named. The PRD says the deleted design
  in three places (`:16`, `:25`, `:30`) — the dated note is the minimum; make sure
  a reader of any of the three reaches it.

**FRD-011 must stay on disk.** `scripts/build-manual.mjs:64` throws if a curated
FRD is missing. Amend in place; never delete. And FRD-011's **Overview is lead
prose**, which the manual build compiles into the committed
`chapters.generated.ts` — so regenerate and commit it, or `npm run check:manual`
fails. That is also the second reason FRD-011 has a single owner.

**Q "Confirm the sequence?" — SCHEDULER: confirmed, GUI-069 → GUI-070 → GUI-071.**
You and GUI-071 both edit `App.tsx:1058-1074`: you remove a key from the
`VIEW_LABELS` object the tab `.map()` iterates, GUI-071 rewrites the count
expression inside that same `.map()`. **You must strike GUI-071's first
verification criterion** ("Backlog tab count equals the number of rows the Backlog
view shows") when this merges — it describes a view you deleted. Edit GUI-071's
verification list directly; do not leave it for someone to notice.

**Pre-flight check, from your own research:** if `Board.tsx` still reads
`STAGES.filter((s) => s.id !== "backlog")`, GUI-069 has NOT landed and you must
not proceed.

**Do not forget `packages/ui/src/index.ts:17-18`** — it re-exports
`BacklogTable`/`BacklogTableProps` from the GUI source tree. `packages/ui` is a
tracked workspace, so deleting the component without that edit breaks
`npm run typecheck` and `npm run build:ui`.

Defaults already taken and not re-opened: the manual `FROM_FRD` entry is removed;
`Ctrl+1…4` becomes `Ctrl+1…3` and the three Backlog-context shortcut rows are
dropped; stale FRD-011 R4 citations are repointed; no view-state migration is
needed (`SavedTabState` is an in-memory ref).
