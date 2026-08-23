# CORE-091 open questions

## Resolved

- [x] Is this a source behavior change? No; the existing byte-parity check identifies a stale generated plugin artifact.
- [x] Is a new dependency or provider credential needed? No.
- [x] What is the canonical repair? `npm run plugin:build` from a normal checkout, followed by the existing parity checks.

## Parked (explicitly deferred)

External provider/runtime evidence is not part of this artifact-only remediation; the broader HZN-007 run retains those boundaries on the provider tickets.
