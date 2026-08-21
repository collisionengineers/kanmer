# GUI-082 open questions

## Resolved

- [x] Is `.check-row` a duplicate of `.check` that should be folded into it? No. [[GUI-072]] records the distinct live call sites and its focused test preserves both; this audit leaves them intact.
- [x] Are `drop-before`/`drop-after` and `timed-out` dead because they lack literal string matches? No. They are generated from a typed drop edge and a typed dispatch state respectively.
- [x] Does the cleanup require a product decision? No. It removes only unproduced renderer selectors and preserves FRD-019 behavior.

## Parked (explicitly deferred)

None.
