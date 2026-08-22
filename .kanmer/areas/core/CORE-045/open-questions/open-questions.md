# Open questions — CORE-045

## Resolved bounded choices

- [x] **Stale threshold:** use a conservative 30-second production threshold; deterministic tests inject a zero/small threshold and clock rather than waiting.
- [x] **Owner liveness:** remove a lock only when the PID is demonstrably dead. Active, permission-uncertain, unreadable, malformed, or racing locks remain protected and contention surfaces after bounded retries.
- [x] **Lock record:** write PID plus creation timestamp as JSON; continue reading the legacy PID-only shape for existing derived lock files. No secrets are stored.
- [x] **Destination ranges:** classify known non-global IPv4/IPv6 special-use/documentation/benchmark/reserved/multicast/unique-local/link-local/loopback/unspecified and mapped IPv4 ranges with no dependency.
- [x] **DNS failure:** empty or failed lookup is a fail-closed destination error; no fallback to literal-only hostname acceptance.

## Parked (explicitly deferred)

- [x] **Live DNS rebinding:** deterministic lookup seams prove preflight decisions; a real rebinding race remains INCONCLUSIVE and is outside this local remediation harness.
- [x] **PID reuse and exact crash point:** PID reuse and termination between stale inspection and unlink require OS-specific stress harnesses; the implementation uses conservative liveness plus bounded race handling and records the boundary as INCONCLUSIVE.
