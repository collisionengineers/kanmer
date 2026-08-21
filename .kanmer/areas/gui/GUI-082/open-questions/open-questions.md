# GUI-082 open questions

## Resolved

- [x] Should `.check-row` remain separate from `.check`? No. GUI-072 deferred that cleanup only until its new generic rule was proven; GUI-082 explicitly owns the consolidation. TicketCreate is its sole remaining call site, and its margin/type additions move under `.modal.ticket-create .check` to preserve rendering.
- [x] Are `drop-before`/`drop-after` and `timed-out` dead because they lack literal string matches? No. They are generated from a typed drop edge and a typed dispatch state respectively.
- [x] Does the cleanup require a product decision? No. It removes only unproduced renderer selectors and preserves FRD-019 behavior.

## Parked (explicitly deferred)

None.
