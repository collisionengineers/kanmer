# Research — CORE-048

## Finding

Independent review of CORE-043 / PR #168 found three blockers before merge: the GUI caches `syncStatus.branch` across an administrator handoff, branch preference can survive after the Git board is closed, and `.github/workflows/pr.yml` still assumes the literal `kanmer-board` branch. ADR-0016's conservative protection inference is an explicit accepted risk and is not in scope.

## Scope

Inspect the board-sync state lifecycle and branch-rename flow in the GUI, the workflow's branch filters/guards, and the existing focused Git tests. Reuse the existing state refresh and configuration helpers; do not add a second branch-state source or broaden GitHub API behavior.

## Acceptance evidence

- A live administrator branch handoff refreshes the open project's effective board branch.
- Closing/reopening without a Git board does not retain a stale branch preference.
- Hosted workflow rules resolve the configured board branch rather than `kanmer-board`.
- Existing GUI Git tests and workflow/static checks remain green; full dispatch/provider baseline failures remain explicit if unrelated.

## Questions

No unresolved questions; ADR-0016 protection inference remains the accepted bounded risk from CORE-043 review.
