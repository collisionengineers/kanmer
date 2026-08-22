# Plan — CORE-063

## Governing docs

- **FRD-020:** keep the canonical board worktree separate from the source checkout and surface sync failures rather than silently choosing another root.
- **FRD-027 / ADR-0020:** preserve source/cache trust boundaries and fail closed when board metadata cannot be reconciled.

## Approach

Capture the resolved attached board root before ignore reconciliation. If reconciliation fails, return a non-usable paused status carrying that root and the actionable error; do not return `empty()` or allow callers to select the source checkout. Add a deterministic attached-path failure test and leave successful paths unchanged.

## Ordered steps

1. Refactor the attached-worktree branch to preserve `attachedRoot` through reconciliation failure and return the explicit paused/error status.
2. Add a deterministic failure regression proving the root is retained and the error is surfaced.
3. Run focused GUI tests, build/typecheck, scripts/docs/manual/diff rails and record inherited failures.
4. Write the post-implementation report, traceability, PR, and review-stage handoff.

## Proof and risks

The exact failure regression proves no source fallback. Real Windows lock/permission behavior remains an explicitly recorded verification boundary, not a silently claimed pass.
