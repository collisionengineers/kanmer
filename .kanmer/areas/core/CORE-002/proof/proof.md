# Proof

Gathered on branch `v3-phase-minus-1-prework` at `cb39080`.

- `docs.test.ts` — "stage constants": the six in order; `leave-X` threshold is
  `index(X)+1` and `enter-Y` is `index(Y)`; a v2 id (`researching`) is rejected
  with the valid list.
- `board.test.ts` — a written board contains no `statuses:` or `priorities:`;
  `lastStageId` returns `done` for the default board, for a board with an empty
  `statuses`, and for no argument at all.
- `smoke.mjs` — `list_board` returns exactly the six ids over real stdio.
- **Live:** this repo's own board migrated 7→6 with zero `needs-restage`.
