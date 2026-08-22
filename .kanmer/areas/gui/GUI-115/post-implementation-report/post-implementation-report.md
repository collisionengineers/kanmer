# Post-implementation report

## Scope delivered

- Added explicit `handoffPending` status for custom-to-custom board branch renames. The warning is carried through successful syncs instead of being erased with the transient Git error, is persisted in user settings across project reopen/restart, is shown in Settings, and has an explicit operator acknowledgement action.
- Repaired Retry re-arms the configured automatic-sync interval even when the retained unavailable worktree originally reported `paused: false`.
- Added per-project lifecycle serialization shared by automatic sync, manual Retry/Sync now, branch preference rename, and project close. Intervals are cleared after the lifecycle lock is acquired and re-armed from settled effective settings on both success and failure.
- Acknowledgement clears only the matching transient warning, preserving unrelated sync/provider errors; close and timer callbacks verify the context is still registered.

## Production callers

The existing `applyGitPreferences`, `syncProject`, `closeProject`, and `CH.syncKanmerNow`/`CH.setKanmerGitPreferences` IPC paths call the lifecycle and handoff state directly. The renderer Settings Git tab exposes the warning and acknowledgement through the typed preload bridge. `settings.ts` owns the durable per-project handoff map.

## Verification

- Commits: `4ad2c858` and `8f3f346d` (`fix(gui-115): close handoff lifecycle gaps`)
- PR: #212, base `core-043-protection-retarget`
- `npm run typecheck -w @kanmer/gui` — PASS
- `npm run build -w @kanmer/gui` — PASS on the implementation commit
- `npm test -w @kanmer/gui` — PASS before the review remediation, 49 test files / 421 tests
- Focused post-remediation suite (`settings.test.ts`, `syncLifecycle.test.ts`, `index.sync.test.ts`) — PASS, 9/9
- New deterministic lifecycle tests: 2/2 PASS
- Retained unavailable-root Retry regressions: 4/4 PASS
- Settings handoff persistence regression: PASS
- `git diff --check` — PASS

Independent review findings F-001..F-004 were fixed in `8f3f346d`; a fresh exact-head review is required before merge. Hosted Windows packaging, real GitHub Actions variable confirmation, and protected-main merge remain outside this ticket's local proof and are recorded as the parent CORE-043 verification boundary.
