# Open questions — CORE-037

All implementation choices are resolved by the ticket and governing FRD; no operator decision is required.

- [x] Use a test-local native filesystem identity comparison for existing paths, with lexical fallback for missing/non-Windows paths; do not alter production path reporting.
- [x] Keep all real Git, branch, ref, and worktree assertions unchanged; this ticket only removes equivalent Windows spelling false negatives.

## Parked (explicitly deferred)

- Broader Windows cleanup `EPERM`/hook-timeout remediation is outside this ticket unless a later run proves it is caused by the same path-identity defect; the baseline failure remains preserved.
