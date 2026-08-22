# Plan — CORE-048

1. Trace CORE-043's board branch state from administrator handoff through the open-project cache and close/reopen lifecycle; name the existing helper to extend.
2. Implement cache invalidation/refresh for handoff and no-board transitions without duplicating branch state.
3. Update `.github/workflows/pr.yml` to consume the supported configured branch contract, preserving the verify gate and repository protections.
4. Add focused regressions for all three review blockers, run the stated GUI/workflow/type/build rails, and record any unrelated baseline failures.
5. Regenerate only required artifacts, update the post-implementation report, and request fresh independent review before CORE-043 can move.
