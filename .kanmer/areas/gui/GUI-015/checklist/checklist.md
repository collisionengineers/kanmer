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
