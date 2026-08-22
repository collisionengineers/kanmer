# Plan

1. Inspect the exact PR #173 cleanup branch and existing error contracts.
2. Ensure a marker-removal failure is surfaced or combined with the read failure while preserving cleanup attempts and no swallowed error.
3. Add a deterministic test injecting both failures; run focused/full core rails, typecheck/build, and plugin parity.
4. Refresh CORE-051 cumulative report/lineage only after this child is merged; keep live Windows evidence explicitly INCONCLUSIVE.
