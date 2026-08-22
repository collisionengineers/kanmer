# Plan — CORE-051

1. Read the complete CORE-045/046/049/050 packets and inspect the current predicates and claim-error flow.
2. Implement precise non-global IPv4 subrange checks, `/20` IPv6 mask handling, and final error propagation without weakening fail-closed behavior.
3. Add deterministic public-exception, IPv6-boundary, and stale-recovery error regressions; retain all inherited tests and regenerate the plugin artifact.
4. Run focused source/core/type/build/plugin rails, refresh CORE-045 report/item traceability, resolve fixed PR threads, and request fresh independent review.
