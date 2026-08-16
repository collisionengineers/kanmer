---
status: draft
covers: new view (v3); the kanban absorbs a scope change (Preparing→Done)
---

# FRD-011 — Backlog list view

## Overview

A backlog is an ordered pile, not a column. Backlog gets a dedicated **sortable, filterable table**; the kanban renders Preparing → Done. Built for the observed reality of ~200-ticket backlogs.

## Requirements

- R1. Columns: id, title, area, groups (chips), labels, profile, age (created), updated. Virtualized rendering (hundreds of rows scroll smoothly).
- R2. **Shared filter state** with the board: search, area, group, label are one state across views (switching views keeps your filter). Sort column/direction is **list-only** state (D27).
- R3. Row actions: open in editor, *Move to Preparing* (gate-checked), add to group, archive; multi-select for bulk move/label/group/archive.
- R4. Horizon-group chips (`NOW`, `NEXT`, …) render as one-click filter chips above the table — the primary triage lens.
- R5. New tickets land here by default (first stage); the board's Backlog column disappears from the kanban.
- R6. Keyboard: arrow navigation, Enter opens, Space selects; a11y row semantics.

## Acceptance criteria

1. A 200-row backlog scrolls without jank; sorting by age is instant.
2. Filter to `NOW` in the backlog, switch to Board: the board is filtered to `NOW`; switch back: sort order intact.
3. Bulk-select five rows → add to `EPIC-002` → one `update_item` per ticket, chips appear.
4. "Move to Preparing" on a `feature` without refs/docs_todo is blocked with the governing-doc reason inline.

Related: D14/D22/D27 · FRD-001 · FRD-002 · FRD-007 B4.
