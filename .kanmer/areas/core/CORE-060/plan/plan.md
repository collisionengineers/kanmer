# Plan — CORE-060

## Governing docs

- **FRD-020:** preserve conflict errors, pause automatic sync, and keep Retry available; branch-handoff mismatch must follow the same visible safety boundary.
- **ADR-0016:** do not auto-repair protected refs or invent a GitHub API; state is observational and the handoff remains operator-owned.

## Approach

Give branch-mismatch state explicit provenance so exact-destination refresh clears only the generated pause/error. Add an automatic flag to timer-triggered sync, suppress both timer scheduling and execution while paused/mismatched, and leave manual Retry on the existing path. Add deterministic state/timer tests and align the manual wording.

## Ordered steps

1. Extend the Git status state/refresh transition with generated mismatch error/pause markers and exact-destination cleanup that preserves genuine state.
2. Split automatic timer invocation from manual sync and guard scheduling/execution while branch handoff state is paused or mismatched.
3. Add focused regressions for generated cleanup, genuine-error preservation, timer suppression, and manual retry availability; update manuals if needed.
4. Run focused GUI tests, build/typecheck, scripts/manual/docs/diff rails and record inherited failures.
5. Write the post-implementation report, traceability, PR, and review handoff.

## Proof and risks

Proof is exact state-machine and timer tests plus the existing FRD-020 GUI Git suite. The residual risk is external branch-variable drift, which remains deliberately surfaced rather than auto-repaired.
