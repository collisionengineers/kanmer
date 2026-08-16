# Proof

Branch `v3-phase-minus-1-prework` at `cb39080`.

- `proof:visual` with a text-only proof document: `get_doc_gates` reports a
  warning naming the missing screenshot, and the move to Done **succeeds**.
  Asserted in core and again over stdio.
- Adding a `.png` under `proof/assets/` clears the warning.
- `proof:visual@staging` on a board declaring no environments is rejected at
  ticket creation, not at move time.
