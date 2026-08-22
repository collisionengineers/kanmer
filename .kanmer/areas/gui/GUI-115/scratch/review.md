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

## Independent cumulative review — PR #212

- Exact reviewed head: `8f3f346dc810d27428f119ba1f94cb5b300040cb`
- Exact base: `9371e2b0e8882426d91dbc99553e96853b99197f`
- Reviewer: codex-recovery (independent of author `gui-115-executor`); no source, merge, or GitHub-thread actions taken.
- Verdict: **NEEDS-CHANGES**

### Prior findings

F-001 (durable `pendingBoardHandoffs` across reopen/restart): fixed by the settings-backed per-project map, restoration in `openProject`, and persistence regression.

F-002 (acknowledgement must clear only its matching warning): fixed by `confirmKanmerGitHandoff` removing the pending marker and clearing `error` only when it equals that marker's warning.

F-003 (preference-apply failure must restore timers): fixed structurally by `applyGitPreferencesLocked` clearing timers after lifecycle acquisition and rearming from effective settings in `finally`.

F-004 (close/Retry/timer lifecycle race): fixed structurally by putting close under `withSyncLifecycles` and checking context identity in the timer callback; the same lifecycle lock covers sync and preference mutation.

### New finding

- **F-005 (P1, merge-blocking): the durable handoff can still be erased without explicit Actions-variable confirmation.** In `apps/gui/src/main/index.ts`, the ordinary-rename path calls `setKanmerGitHandoff(projectId, ... ? handoff : null)`. A failed rename (`renamed.ok === false`) therefore deletes any existing durable marker, even though the in-memory status is spread forward and still shows the warning. A successful rename with no warning also deletes the marker without the explicit `confirmKanmerGitHandoff` action. Closing/reopening after either path loses the pending warning, contrary to the plan's “clears only after ... positively confirmed” acceptance and the report's explicit-acknowledgement contract. Preserve the existing durable marker on failure/no-new-warning, or update it only when a new warning is produced; clear it only through the acknowledgement path. Add a regression covering an existing marker followed by failed/non-warning preference application and a subsequent settings read/reopen.

### Evidence

- `npm run test -w @kanmer/gui -- --run src/main/settings.test.ts src/main/kanmerGit.test.ts src/main/index.sync.test.ts src/main/syncLifecycle.test.ts`: **exit 0**, 37/37 (settings 3/3, lifecycle 2/2, index/sync 4/4, Git integration 28/28).
- `npm run typecheck -w @kanmer/gui`: **exit 0**.
- `git diff --check 9371e2b0e8882426d91dbc99553e96853b99197f 8f3f346dc810d27428f119ba1f94cb5b300040cb`: **exit 0**.
- PR status checks were absent in the inspected GitHub response; hosted packaging/Actions-variable/protected-main evidence remains outside this local review boundary.

## Fresh exact-head cumulative review — PR #212

- Exact reviewed head: `d79f5f610b4c1dee5b2707f8a3e0b1807c771da1`
- Exact base: `9371e2b0e8882426d91dbc99553e96853b99197f`
- Reviewer: core041-executor, independent of the implementation author; no source edits, merge, or GitHub-thread actions taken.
- Verdict: **NEEDS-CHANGES** (code findings F-001..F-005 are resolved; packet evidence needs refresh).

### Finding dispositions

- F-001 durable pending handoff across reopen/restart: **FIXED** by the settings-backed per-project map, restoration in `openProject`, and persistence coverage.
- F-002 acknowledgement clears only its matching warning: **FIXED** by exact warning comparison in `confirmKanmerGitHandoff`.
- F-003 preference failure restores timers: **FIXED** by lifecycle-locked cleanup and `finally` rearming from effective settings.
- F-004 close/Retry/timer lifecycle serialization: **FIXED** by the shared lifecycle lock and context-identity timer guard.
- F-005 durable handoff is not erased by later clean/failed preference rename: **FIXED** by only writing a new durable marker when a new warning is produced; the new regression confirms an existing marker survives a later clean rename.

- **F-006 (P2, evidence-blocking): the ticket post-implementation report and PR body are stale at this exact head.** They still state the post-remediation focused suite as 9/9, but `d79f5f61` adds the fifth `index.sync.test.ts` case, making the requested focused set 10/10. Update the report and PR verification text to the exact new evidence (and retain the broader suite result); no code change is required.

### Fresh evidence

- `npm run test -w @kanmer/gui -- --run src/main/settings.test.ts src/main/kanmerGit.test.ts src/main/index.sync.test.ts src/main/syncLifecycle.test.ts`: **exit 0**, 38/38 total; settings 3/3, lifecycle 2/2, index/sync 5/5, Git integration 28/28.
- Requested focused subset (settings/lifecycle/index): **10/10 PASS**.
- `npm run typecheck -w @kanmer/gui`: **exit 0**.
- `git diff --check 9371e2b0e8882426d91dbc99553e96853b99197f d79f5f610b4c1dee5b2707f8a3e0b1807c771da1`: **exit 0**.
- PR #212 remains open at the exact head with base `9371e2b0`; GitHub reported no status-check rollup in this inspection. Hosted packaging/Actions-variable/protected-main evidence remains outside local proof.
