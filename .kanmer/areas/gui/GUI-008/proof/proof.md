# Proof

Branch at `86594dc`.

- TicketCreate offers Profile where Priority was; the value is sent on create
  only when set, so "inherit" really does inherit rather than writing a literal.
- The Editor's picker sits beside Area and round-trips through the diff save —
  `profile` is in `FIELD_KEYS`, so it is covered by the existing dirty-tracking
  and conflict logic rather than bypassing them.
- Changing it visibly re-gates: the requirements panel is keyed on
  `item.profile` and re-reads.
- GUI typecheck, build, 124 GUI tests, boot smoke exit 0.

**Not proven here:** that the picker reads well next to a real ticket's other
fields. That is a look-at-it check.
