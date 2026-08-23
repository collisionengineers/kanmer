---
kind: proof-record
merged_sha: "fdaededcf8bff0c5d5867e386782d8bdc32324e9"
prs:
  - "163"
environment: "origin/main; GitHub Actions Windows/Node verification"
verified_at: "2026-08-23T01:35:00Z"
result: PASS
---

## Merged-main verification

The cumulative CORE-026 stack (PR #163) merged into main at `fdaededcf8bff0c5d5867e386782d8bdc32324e9`; final implementation commits and remediation heads are reachable from that merge and its current descendant `a8cc6b01`. Hosted run `32603963529` passed both verify and kanmer-gate at the exact cumulative head `cbba69d682c448943cce87c9825589a44f4260d4` before the later CORE-043 merge. The hosted rail recorded the source/core, GUI, scripts, typecheck, plugin/manual/docs, and diff checks required by the ticket's review packet.

The merged source-declaration behavior is therefore verified on main. No external runtime or visual claim is made beyond the hosted deterministic rails.
