# Research — CORE-060

## Question

How should branch-handoff mismatch state interact with existing sync errors and the automatic timer?

## Findings

1. `refreshBoardBranch` in `apps/gui/src/main/kanmerGit.ts` sets `branchMismatch: true`, a generated error when no error exists, and `paused: true` when the live worktree is not on the requested branch. On exact destination it currently clears only `branchMismatch`, leaving a generated error and pause visible forever.
2. The same status object can already carry a genuine sync error/paused state. A successful handoff must clear only state created by the mismatch detection, not overwrite a real conflict or push failure.
3. `applyGitPreferences` in `apps/gui/src/main/index.ts` unconditionally re-arms the interval for every available project. The timer calls `syncProject`, which calls `syncBoard` without checking `paused`; a timer can therefore push using a stale cached branch while the handoff is incomplete.
4. Manual “Sync now/Retry” uses the same `syncProject` seam, so a blanket `syncBoard` pause guard would break the documented retry path. Automatic and manual calls need an explicit distinction.
5. Existing GUI tests cover branch equality and protected/ordinary rename guards but do not prove generated-state cleanup or timer suppression/execution guards.

## Implications

Track whether the mismatch created the error and pause (separate markers or an equivalent typed reason), clear only those markers after exact-destination validation, and preserve any genuine state. Add a small automatic-sync guard: do not schedule a timer for paused/mismatched contexts, and re-check the state at timer execution while leaving manual Retry available. Keep the branch handoff fail-closed and deterministic.
