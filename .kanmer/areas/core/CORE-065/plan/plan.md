# Plan

1. Identify the existing failed-Git status and renderer/settings handling.
2. Add a distinct retryable state/action that invokes reconciliation on the retained board root.
3. Keep the error visible until retry succeeds; on success restore normal availability and preserve idempotence.
4. Add deterministic tests for failure visibility, retry after repair, and repeated retry.
5. Run focused/full verification rails and record any external evidence limits.
