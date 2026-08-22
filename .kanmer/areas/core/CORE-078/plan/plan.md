# Plan

1. Identify the manual retry success path and reuse the canonical timer-arm helper.
2. Preserve paused/error state on failure while restoring the configured interval on success.
3. Add deterministic fake-timer coverage and run focused GUI, core, scripts, build and diff rails.
