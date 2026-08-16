**Operator decision, 2026-08-16 — option 1: accept the loss.**

Asked as the ticket demanded ("pick one deliberately"), with the cost stated:
multi-select and bulk move / archive / add-to-group go away with `BacklogTable`.

Chosen anyway. So:

- [[GUI-069]] makes Backlog a **plain** first column — no multi-select, no
  context-menu bulk actions ported over.
- This ticket deletes the tab, the `BacklogTable` branch, `BacklogTable.tsx` and
  `windowedRows.ts` if nothing else uses them.
- FRD-011 is amended, not silently contradicted. Its R5 ("the board's Backlog
  column disappears from the kanban") is **reversed**, and R1/R3/R4/R6 — the
  table, its bulk actions, the horizon chips, the keyboard grid — describe a
  view that will no longer exist. The amendment has to say the capability was
  weighed and dropped, not pretend it moved somewhere.

Recorded here because the reasoning is what review checks, and a decision that
only exists in a chat transcript is not recorded.
