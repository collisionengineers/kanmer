# Plan

1. Trace CORE-043's branch refresh state machine, workflow variable handoff, and manual source. Keep one canonical destination value and make refresh prove it matches the requested branch before applying protection changes.
2. Preserve paused/error state across refresh and add deterministic regressions for stale/equality and state transitions.
3. Update the workflow/manual guidance to state the `KANMER_BOARD_BRANCH` handoff and one supported rename procedure; remove contradictory troubleshooting text.
4. Run focused tests, full typecheck/build and the repository verification command; refresh CORE-043 cumulative traceability only after the child merge.
5. Record external protection-retarget limitations as INCONCLUSIVE rather than fabricating live evidence.
