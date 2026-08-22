# CORE-083 open questions

No product decision is unresolved; the review findings define the bounded behavior.

## Parked (explicitly deferred)

- [x] Live concurrent GUI/agent edit races beyond deterministic version checks are deferred because no packaged multi-process harness is available; mismatch must fail closed and preserve source state.
- [x] Cross-device/network-filesystem fingerprint semantics are deferred because this workflow is local Git/filesystem synchronization.
