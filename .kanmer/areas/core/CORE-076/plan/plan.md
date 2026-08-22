# Plan — CORE-076

1. Reuse the existing `resumeOrphanMigration` seam and distinguish board commit/push completion from source cleanup completion.
2. If an orphan board already has `HEAD` but the source `.kanmer/` remains, retry only the cleanup; if it has no `HEAD`, commit/push first and then clean up.
3. Keep cleanup idempotent, preserve surfaced errors/paused status, and add a deterministic regression that simulates cleanup failure after board commit then retries successfully.
4. Run focused GUI Git tests, GUI typecheck/build prerequisite, scripts/diff rails, update the report and traceability, and stop at Review.
