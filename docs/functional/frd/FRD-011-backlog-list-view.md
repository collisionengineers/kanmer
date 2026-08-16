---
status: withdrawn
withdrawn: 2026-08-16 by GUI-070 — the view was built, shipped, and removed; see the Amendment below
covers: new view (v3); the kanban absorbs a scope change (Preparing→Done)
---

# FRD-011 — Backlog list view

> **Withdrawn.** This feature was built (GUI-015), shipped, and then removed
> (GUI-070). The requirements below are kept **as they were written** because a
> withdrawn document is a record, not a blank page — the reasoning is what makes
> the reversal legible, and R2's shared-filter behaviour is still live on the
> board. What is true *now* is in [Amendment (GUI-070)](#amendment-gui-070) at
> the foot of this file. Read that first; read the rest as history.

## Overview

Kanmer has no separate Backlog view. Backlog is the kanban's first column and
the only place backlog tickets live. This document records the opposite design —
a dedicated sortable, filterable Backlog table alongside a Preparing→Done
kanban — which was built for the observed reality of ~200-ticket backlogs, and
then withdrawn because two places showing the same tickets cost more than the
table was worth.

## Requirements

*Withdrawn except R2 — see the amendment. Kept verbatim as shipped.*

- R1. ~~Columns: id, title, area, groups (chips), labels, profile, age (created), updated. Virtualized rendering (hundreds of rows scroll smoothly).~~ **Withdrawn (GUI-070)** — there is no table.
- R2. **Shared filter state** with the board: search, area, group, label are one state across views (switching views keeps your filter). Sort column/direction is **list-only** state (D27). **Still live**, minus its list-only half: the shared filter state survives across Board / Standup / Archived; there is no sort state because there is no sortable table.
- R3. ~~Row actions: open in editor, *Move to Preparing* (gate-checked), add to group, archive; multi-select for bulk move/label/group/archive.~~ **Withdrawn (GUI-070)** — and **not relocated**; see the amendment.
- R4. ~~Horizon-group chips (`NOW`, `NEXT`, …) render as one-click filter chips above the table — the primary triage lens.~~ **Withdrawn as written (GUI-070)** — the chips themselves survive, but as a **board** feature specified by FRD-001 G8 and FRD-019 R4; they live in the FilterBar and always did. Cite FRD-001 G8, not this requirement.
- R5. ~~New tickets land here by default (first stage); the board's Backlog column disappears from the kanban.~~ **Reversed (GUI-070)** — see the amendment.
- R6. ~~Keyboard: arrow navigation, Enter opens, Space selects; a11y row semantics.~~ **Withdrawn (GUI-070)** — those row bindings existed only inside the table and have no surviving surface; they are gone from `shared/shortcuts.ts` too.

## Acceptance criteria

*Historical — these were met by the shipped view. None is testable now.*

1. A 200-row backlog scrolls without jank; sorting by age is instant.
2. Filter to `NOW` in the backlog, switch to Board: the board is filtered to `NOW`; switch back: sort order intact.
3. Bulk-select five rows → add to `EPIC-002` → one `update_item` per ticket, chips appear.
4. "Move to Preparing" on a `feature` without refs/docs_todo is blocked with the governing-doc reason inline.

## Amendment (GUI-070)

*2026-08-16. Authorized by the user in the GUI-070 request; the `withdrawn`
status was chosen explicitly by the operator, knowing it is the first in this
repo.*

### R5 is reversed

R5 said "the board's Backlog column disappears from the kanban." **It does not.**
GUI-069 made Backlog the kanban's **first column**, rendered from the same
`STAGES` constant as the other five, so the board never gains or loses a column
as a status count crosses zero. GUI-070 then deleted the list view, its tab, its
component and its stylesheet block. The current, true statement is:

> Backlog is the first of the six board columns. There is no separate Backlog
> view, no Backlog tab, and no second place backlog tickets appear.

R5's other half — new tickets land in Backlog by default, it being the first
stage — **still holds**; that is FRD-007's fixed six-stage order, not this
document's.

### R1, R3, R4, R6 are withdrawn

They describe a table that no longer exists. R4's *chips* survive on the board
under FRD-001 G8; R1, R3 and R6 have no surviving surface at all.

### Bulk triage was weighed and dropped — not relocated

This is the part worth being blunt about, because the cheap version of this
amendment would imply the capability simply moved.

**It did not move. It is gone.** Multi-select, bulk *Move to Preparing*, bulk
archive, bulk add-to-group, and the per-ticket failure report that told you which
tickets in a mixed selection could not move and why — all of it died with
`BacklogTable`. GUI-069's Backlog column is deliberately **plain**: it has the
same card affordances as every other column and no bulk selection.

The choice was made with the cost stated. The ticket put two options on the
table — accept the loss, or port multi-select and a context-menu bulk move onto
the board first — and the operator picked **accept the loss**, on the reasoning
that bulk triage is rare enough not to justify the permanent split-brain of two
surfaces showing the same tickets. That is a trade, not an oversight.

If the loss bites in practice, the fix is a **new ticket against the board
column**, not a reinstatement of this view; `BacklogTable.tsx` is recoverable
from git history at `apps/gui/src/renderer/src/components/BacklogTable.tsx`.

### Why this file still exists

Deleting it was never an option. `scripts/build-manual.mjs` throws when a curated
FRD is missing, and — more to the point — a governing document that argued for a
design deserves to record that the argument was overturned, and why. The manual
chapter generated from this file was removed in the same change: a chapter
explaining a view the user cannot open is worse than no chapter.

### The `withdrawn` convention this sets

FRD-011 is the first withdrawn document in `docs/`. For whoever copies it:

- `status: withdrawn` in the frontmatter, with a `withdrawn:` line giving the
  date and the ticket that did it.
- A short block quote under the H1 pointing at the amendment, so a reader who
  lands mid-file is not misled by the requirements above it.
- **Leave the original requirements readable.** Strike them and say what replaced
  them; do not delete them. The next person needs to know what was tried.
- One `## Amendment (<TICKET>)` section stating what is true now, what was lost,
  and what the loss bought.
- Amend **in place**. Per FRD-014, superseding-without-editing is the *ADR*
  convention; an FRD describes a feature, and when the feature goes the FRD says
  so.

Related: D14/D22/D27 · FRD-001 · FRD-002 · FRD-007 B4 (amended by GUI-070) ·
FRD-019 R5 (amended by GUI-070) · PRD-001 problem 6 (dated note) · GUI-069 ·
GUI-070.
