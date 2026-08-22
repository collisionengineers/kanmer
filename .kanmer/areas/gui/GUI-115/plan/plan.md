# Implementation plan

1. Trace the current handoff, Retry, periodic-sync, and branch-rename callers in `kanmerGit.ts` and `index.ts`; identify the existing status/timer ownership and preserve their public contracts.
2. Add a persistent handoff-required state that survives ordinary sync status refreshes and clears only after the Actions branch variable is positively confirmed.
3. Serialize rename/push/delete against automatic sync and Retry with the existing project lifecycle state; pause the timer while the mutation is in flight and re-arm it from the resulting project state on every exit path.
4. Add focused deterministic tests for the three PR findings, including failure/retry paths and overlapping calls; run the relevant GUI tests, typecheck, build, scripts, and diff checks.
5. Record the post-implementation report with exact commit/test evidence and open a PR targeting `core-043-protection-retarget`; stop for independent review and merge.

## Acceptance criteria

- A hosted handoff warning remains observable until the configured board branch is confirmed; a transient sync error cannot erase it.
- Retrying a repaired unavailable project restores automatic sync when the project is healthy, including after a failed repair attempt where retry remains possible.
- Branch rename/push/delete and sync/Retry are mutually exclusive for a project, with no lost timer and no swallowed error.
- Focused regressions pass and all changed code has a production caller.
