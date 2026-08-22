# Plan

1. Keep enough state on the failed orphan path to identify pending source migration.
2. On retry, reconcile ignore, commit/push the board, and finish source cleanup safely.
3. Add deterministic retry/idempotence coverage and run rails.
