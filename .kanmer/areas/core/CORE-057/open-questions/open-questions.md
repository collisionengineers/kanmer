# Open questions — CORE-057

All planning questions are resolved or explicitly parked below.

## Resolved

- [x] Keep the existing HTTPS/public-destination and same-origin contract; harden only DNS-to-request binding and the shared deadline.
- [x] Reuse existing injected lookup/fetch seams and add no dependency unless an already-installed runtime transport proves unsuitable.

## Parked (explicitly deferred)

- [x] Live DNS rebinding and private-network reachability are unavailable in this environment; deterministic fixtures are required and live evidence remains INCONCLUSIVE.
- [x] Packaged installer/remote-host proof is outside this remediation and remains INCONCLUSIVE.
