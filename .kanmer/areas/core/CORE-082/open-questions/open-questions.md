# CORE-082 open questions

No unresolved product questions remain; the ticket body and CORE-026 review findings define the bounded implementation.

## Parked (explicitly deferred)

- [x] Live Windows PID-reuse proof across an actual process restart is deferred because deterministic tests can exercise the ownership seam, while this lane cannot claim external packaged or multi-process evidence.
- [x] Cross-machine/network filesystem lock semantics are deferred because the existing contract is local filesystem atomicity and no network-filesystem test environment is available.
- [x] Changes to FRD-027 or ADR-0020 are deferred because this ticket implements their existing safety contract and does not alter product scope.
