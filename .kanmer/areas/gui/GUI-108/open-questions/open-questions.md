# Open questions — GUI-108

## Resolved

- [x] Can the existing gate channel support this UX? Yes. The existing `getGateStatus` response supplies the current authoritative reasons after the move rejection; no new IPC is needed.
- [x] Where should document creation happen? In the existing Editor document inventory/create affordance, selected by the new initial-document prop.
- [x] How should unrelated or ambiguous move errors behave? They retain the existing friendly error/banner fallback and do not receive guessed gate actions.

## Parked (explicitly deferred)

- [x] Real packaged Electron drag/drop visual inspection is unavailable in this run. Unit/component coverage proves payload and rendering inputs, but visual placement and pointer behavior remain INCONCLUSIVE for independent review.
