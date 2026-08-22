# Plan — CORE-050

1. Read complete CORE-046/047/049 packets and inspect retry, token, marker, and cleanup helpers.
2. Refactor retry so each attempt re-reads and validates the expected stale identity and owner token before quarantine; abort safely on replacement/claimant changes.
3. Validate persisted tokens against the marker-path contract before filesystem access; return cleanup errors instead of suppressing them while preserving concurrency results.
4. Add deterministic transient-then-replacement, active-claimant, malformed-token/path, and cleanup-error regressions; retain all inherited rails and regenerate plugin artifact.
5. Refresh cumulative reports/thread dispositions, request fresh independent review of the stacked head, and stop before merge.
