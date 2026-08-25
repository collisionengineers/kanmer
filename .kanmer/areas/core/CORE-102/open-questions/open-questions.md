# Open questions — CORE-102

## Resolved

- [x] **Was cross-file Vitest parallelism still enabled in the failing release rail?** No. Current `packages/core/package.json` already invokes `vitest run --no-file-parallelism`, and the v0.3.7 failure occurred after CORE-095's package-scoped serial policy merged.
- [x] **Did the failed log prove an assertion, ID allocation, or shared-temp-root defect?** No. It records one timeout after 309 passing core tests; the target's unique `mkdtemp` root and the absence of an `EEXIST`/assertion error do not evidence a logical fixture collision.
- [x] **Is a timeout/retry increase an eligible remediation?** No. The ticket and CORE-095 constraints require retaining the 5,000 ms finite test bound and prohibit retries that mask a failure.
- [x] **May CORE-102 mutate the v0.3.7 release or rerun its tag workflow?** No. Historical release/tag/workflow evidence is immutable under this ticket.
- [x] **What concrete cold operation is present on the target's call path?** `addColumn → setBoard → withExclusiveFileLock` performs the first cached-per-process Windows `powershell.exe Get-Process … StartTime` lookup. Local direct measurement confirms a cold `addColumn` is materially slower than later cached calls.

## Parked (explicitly deferred)

- [ ] **Should production lock identity/recovery be redesigned to avoid the synchronous Windows PowerShell lookup?** Parked because the lookup protects dead-owner/PID-reuse handling in `io.ts` (commit `388a1b284`). CORE-102 must not weaken that concurrency guarantee merely to move a test below its timeout. Treat it as a separate design/safety concern unless planning can demonstrate a narrow, equivalent proof obligation.
- [ ] **What exact await consumed the additional hosted time from 5,000 ms to 8,185 ms?** Parked because run 32792361526 has no per-await trace and may not be rerun under this ticket. The documented causal explanation is evidence-backed inference, not a fabricated trace.
