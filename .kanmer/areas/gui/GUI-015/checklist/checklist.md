# Checklist

- [ ] `windowedRows` pure, unit tested, with overscan
- [ ] boundary cases: 0 rows, fewer than a viewport, scrolled past the end
- [ ] table renders only the window, spacers preserve scroll height
- [ ] sort is display-only and never writes `order`
- [ ] filters shared with the board (no new plumbing)
- [ ] row select, shift-range, select-all-visible
- [ ] bulk Move to Preparing — per ticket, failures reported with reasons
- [ ] bulk add-to-group
- [ ] bulk archive, confirmed with a count
- [ ] Up/Down/Space/Enter keyboard model
- [ ] `role="row"`, `aria-selected`, `aria-sort`
- [ ] board drops the Backlog column
- [ ] moving a ticket back to Backlog still possible
- [ ] `@kanmer/ui` barrel export
- [ ] 200-row fixture scrolls cleanly

## Reconciliation notes — 2026-08-21

GUI-015 is a stale active board record, not an unshipped current feature. The historical implementation is commit 841c5bc0 (PR #23), and that commit is reachable from origin/main only as history; GUI-070 commit 2f06713 is also reachable and intentionally removes the BacklogTable, windowedRows, tab, styles, and barrel exports. Current FRD-011 has status: withdrawn and its amendment explicitly says this view must not be reinstated. Therefore the 15 implementation boxes above remain unchecked: none is being falsely marked complete against current main.

No code changes were made, no new PR was opened, and GUI-016/GUI-017 were not touched. The correct disposition is independent review of this superseded ticket and an authorized board decision (reconcile/archive/link) rather than resurrecting withdrawn UI.

Evidence: 841c5bc reachable from origin/main (exit 0); 2f06713 reachable from origin/main (exit 0); BacklogTable.tsx absent on current main; git diff --check exit 0 and no source diff. GUI typecheck exit 0. GUI build exit 0 (existing gray-matter eval warning). The full GUI Vitest run printed passing files but did not terminate; it was interrupted after the hang and returned exit 1, so it is INCONCLUSIVE, not PASS. Manual visual evidence was not available and is not claimed.
