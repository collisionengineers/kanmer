# Open questions — CORE-047

## Parked (explicitly deferred)

- Genuine multi-process Windows crash/PID-reuse stress is deferred because it requires an external OS harness; deterministic injected ordering and all local rails are still required.
- Hosted workflow availability is not a source correctness dependency for this bounded fix; any unavailable hosted run remains explicitly INCONCLUSIVE in the report.
