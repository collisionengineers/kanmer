# Proof

Branch at `cb39080`.

- `Board.tsx` renders from `STAGES`; the unknown-stage fallback column is
  retained and still exercised by `lib/board.test.ts`.
- Settings' Board tab shows areas only, with the fixed-stage explanation.
- `shared/stages.test.ts` asserts the mirror matches core on ids, names,
  colours, order, first/last, and the unknown-id naming fallback.
- GUI typecheck and build clean; boot smoke exit 0.
- **Live:** this repo's own migrated board renders its tickets across the six
  stages.
