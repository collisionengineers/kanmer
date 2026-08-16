**Operator decision, 2026-08-16 — the Board count keeps its current meaning.**

> **All non-archived tickets**, not "not-done". Board 131, Backlog 24.

So the defect is narrower than the ticket's second question implied: the shared
expression at `App.tsx:1067-1072` is the whole bug, and Board's number was
already correct. Only Backlog's was wrong, by a factor of ~5.

Two consequences for the plan:

- The fix is to derive each view's count from **the same predicate the view
  filters by**, so they cannot drift again — not to change what Board counts.
- Sequence this **after** [[GUI-070]], which deletes the Backlog tab entirely.
  Doing it first would mean writing a per-view count for a view about to be
  removed. The shared-expression defect still needs fixing for Board / Standup /
  Archived, which is why the ticket survives GUI-070 rather than being absorbed
  by it.

The verification box "Board tab count matches the documented meaning, asserted in
a test" stands — the meaning is now documented here, and the test is what stops
the next filter change from silently redefining it.
