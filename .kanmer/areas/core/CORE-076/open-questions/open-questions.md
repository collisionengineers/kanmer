# Open questions — CORE-076

## Resolved

- [x] A retry after board commit must attempt source cleanup again; it must not return solely because `HEAD` exists.
- [x] Existing board/ignore behavior remains out of scope; this ticket changes only orphan finalization.

## Parked (explicitly deferred)

- Live hosted Windows file-lock and remote cleanup behavior remains unavailable locally; deterministic error propagation and retry evidence are required.
