# Independent review — GUI-115 PR #212

## Review binding

- Reviewer: core041-executor (independent of author `codex-recovery`; no source edits, merge, or thread resolution performed).
- PR head: `4ad2c858a410349fa05d7f5097e66b3a8e4945ae`.
- Base: `core-043-protection-retarget` at `9371e2b0e8882426d91dbc99553e96853b99197f`.
- Ticket: GUI-115, status Review; governing refs FRD-020 and ADR-0016.

## Changes inspected

- `apps/gui/src/main/kanmerGit.ts`: adds `handoffPending` status and creates it for retained custom-branch handoff warnings.
- `apps/gui/src/main/index.ts`: adds `withSyncLifecycles` around preference updates, sync/Retry, and acknowledgement; adds a Retry timer re-arm path and the acknowledgement IPC handler.
- `apps/gui/src/main/syncLifecycle.ts` plus its test: serializes per-project lifecycle operations.
- `apps/gui/src/shared/ipc.ts`, `apps/gui/src/preload/index.ts`, and renderer Settings: wire the explicit hosted-handoff acknowledgement action and warning.
- `apps/gui/src/main/index.sync.test.ts`: adds retained unavailable-root Retry timer coverage.

## Evidence

- Focused GUI tests: PASS, 34/34 total — `kanmerGit.test.ts` 28/28, `index.sync.test.ts` 4/4, `syncLifecycle.test.ts` 2/2.
- GUI typecheck: PASS.
- `git diff --check`: PASS.
- Author-reported full GUI/build evidence in the packet was not independently rerun; hosted Actions-variable/protection evidence remains INCONCLUSIVE.

## Findings and dispositions

### F-001 — blocking P1/P2: pending handoff is not persistent across reopen

PR thread `3836967483`: `handoffPending` exists only on the in-memory `ProjectContext`. After close/reopen or app restart, `ensureBoardWorktree` returns a clean status when the worktree is already attached to the new branch, so the retained old remote ref and unconfirmed `KANMER_BOARD_BRANCH` handoff warning disappear without acknowledgement. This directly violates the ticket's persistent-warning acceptance. Recommendation: persist or reconstruct the marker from durable branch/ref state until explicit acknowledgement.

### F-002 — blocking P2: acknowledgement leaves the same warning in `error`

PR thread `3836967488`: `confirmKanmerGitHandoff` removes `handoffPending` but leaves `syncStatus.error` unchanged. Because Settings renders both fields, clicking “Mark hosted handoff complete” can leave the acknowledged warning visible. Recommendation: clear `error` only when it equals the pending handoff warning, preserving unrelated sync/provider failures.

### F-003 — blocking P2: preference failure leaves all automatic timers disabled

PR thread `3836967492`: `applyGitPreferencesLocked` clears every timer before awaited settings/refresh/rename/reconciliation work, but re-arms them only after the success path. A rejected settings write or later awaited operation leaves healthy projects without automatic sync until another settings change/reopen. Recommendation: re-arm in `finally` from the effective persisted settings and settled status.

### F-004 — blocking P2: close can race a manual Retry and create an orphan timer

PR thread `3836967495`: `closeProject` does not share the lifecycle lock. If a manual sync is in flight, close clears/removes the context, then `syncProjectLocked` can call `armSyncTimer(projectId, ctx, ...)` after success. The orphan interval calls `syncProject` for a project no longer in `contexts`, producing discarded `Project not open` failures. Recommendation: serialize close with lifecycle operations or verify the context is still registered before re-arming.

## Verdict

NEEDS-CHANGES. The focused rails and typecheck pass, and the diff is otherwise scoped and wired through production IPC/UI paths, but F-001 through F-004 leave the requested lifecycle semantics incomplete. PR #212 should remain open for remediation and fresh exact-head review.
