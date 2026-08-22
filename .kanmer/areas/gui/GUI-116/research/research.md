# GUI-116 research

## Question

How should reopening a closed project reconcile saved-branch changes for Codex, Claude, and OpenCode, while making staged branch state for user-scoped Grok and Antigravity explicit and safe?

## Governing evidence

- PR #168 review finding 3836890756 requires registration reconciliation after a closed project reopens. The existing `applyGitPreferences` path reconciles only contexts that are already open.
- PR #168 review finding 3836890758 requires native Grok and Antigravity staged branch state to be refreshed or an explicit reconnect requirement before handoff completion.
- `apps/gui/src/main/index.ts` opens the project after `ensureBoardWorktree`, but currently does not invoke provider reconciliation during `openProject`.
- `apps/gui/src/main/connect.ts` already exports `reconcileProviderRegistration`. It is provider-owned, idempotent, and only writes an existing provider project registration; it is the correct seam for Codex, Claude, and OpenCode.
- `apps/gui/src/main/providers.ts` models Grok and Antigravity as user-scoped native plugins with no project registration merge. Their Connect path stages `KANMER_BOARD_BRANCH` in a disposable descriptor and performs the provider-owned install/functional proof. Re-running that automatically from project reopen could mutate user-wide state or require unavailable host credentials.
- GUI-115 provides the current project lifecycle/timer serialization seam. Reconciliation must run after worktree reconciliation and before the project is returned to the caller, without creating a second lifecycle or touching unrelated contexts.

## Decision

1. After `ensureBoardWorktree` establishes the reopened project's current board root and branch, call the existing provider-owned reconciliation helper for Codex, Claude, and OpenCode. Surface a provider failure in that project's sync status; do not hide it behind a successful reopen.
2. Track a durable per-project native reconnect requirement for Grok and Antigravity when the saved branch changes. The Settings Git surface will explain that these providers are user-scoped and must be explicitly reconnected to refresh the staged `KANMER_BOARD_BRANCH`; successful native Connect clears only the matching provider's requirement.
3. Keep native installation, user-plugin mutation, credentials, and live host proof on the explicit Connect path. No automatic native CLI invocation is added to reopen.
4. Preserve project isolation: only the reopened project's status and its own settings entry are changed.

## Evidence boundary

Native host/plugin availability and hosted proof are not available in this deterministic lane. They remain INCONCLUSIVE and are not represented as a passing functional claim.
