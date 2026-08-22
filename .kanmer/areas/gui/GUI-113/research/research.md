# GUI-113 research

## Brief and mapped review evidence

GUI-113 addresses current-head PR #168 findings 3836808784 and 3836808786. Finding 3836808784 identifies a production gap in `apps/gui/src/main/index.ts`: saving a changed board-branch preference updates the global setting and board worktree state but does not reconcile already-connected Codex, Claude, or OpenCode project registrations. Their persisted MCP invocation can continue naming the previous/default branch. Finding 3836808786 identifies the native-plugin early return in `apps/gui/src/main/connect.ts`: Grok and Antigravity bypass the branch-aware `serverInvocation` path, and their installed descriptors contain no `KANMER_BOARD_BRANCH` value.

The ticket is constrained to provider registration reconciliation and native descriptor propagation. It must not change branch-protection ownership, GitHub Actions variables, unrelated projects, provider installation ownership, or MCP runtime discovery semantics.

## Current implementation seams

- `applyGitPreferences` in `apps/gui/src/main/index.ts` is the production caller for saved branch changes. It already refreshes open worktree branch state, performs the guarded rename, and re-arms timers.
- `connectAgent` in `apps/gui/src/main/connect.ts` accepts `boardBranch` and passes it to `serverInvocation` for Codex/Claude/OpenCode, but its native-plugin early return drops the argument.
- `AgentProvider.register` owns the registration shape and ownership rules in `apps/gui/src/main/providers.ts`; registration state is provider-specific and must be used before rewriting a file.
- Grok owns `.grok/config.toml`; Antigravity owns `.agents/mcp_config.json` only as legacy migration input. New native installs use the user plugin descriptors (`plugins/kanmer/mcp/claude.mcp.json` and `plugins/kanmer/mcp_config.json`).
- Existing tests already cover branch-aware portable invocations, provider-specific registration ownership, native plugin lifecycle, protected refusal, and real-Git sync behavior. The new regressions must extend these seams rather than create a parallel provider registry.

## Planned bounded behavior

1. Add an exported, provider-owned registration reconciliation helper. It will inspect only the current project, use each provider's declared registration state/config path, rewrite only a registration proven to belong to that provider, and preserve unknown keys/other providers. It will return explicit per-provider failures rather than swallowing them.
2. Call that helper from the successful saved-branch path in `applyGitPreferences` for each open context whose worktree is now on the configured branch. A protected refusal does not reconcile and retains its existing pause/error state. A reconciliation failure becomes visible in the context status.
3. Make native plugin installation stage a disposable copy of the descriptor bundle and set `mcpServers.kanmer.env.KANMER_BOARD_BRANCH` to the normalized saved branch in the staged Grok/Antigravity descriptor. The source descriptors will retain the same default environment contract. The original bundle and unrelated user/plugin state remain byte-identical.
4. Pass the saved branch into the native path and add adversarial tests for custom names, idempotence, unknown registration preservation, unregistered providers, protected/refused paths, descriptor propagation, and hostile branch text.

## External evidence boundary

No hosted GitHub protection or native-host credential proof is available to this lane. Those claims remain INCONCLUSIVE; deterministic source/tests and local provider descriptor inspection are the acceptance evidence.
