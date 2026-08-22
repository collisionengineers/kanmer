# MCP-044 files map

## Production files

| File | Planned change | Risk / reason |
|---|---|---|
| `apps/gui/src/main/providers.ts` | Let the portable and Electron invocations carry a validated `KANMER_BOARD_BRANCH` value; retain the default for existing pure callers. | This is the single provider registry/serialization source for Codex TOML, Claude CLI, OpenCode JSON and Antigravity JSON. |
| `apps/gui/src/main/connect.ts` | Thread the configured branch through `serverInvocation` and `connectAgent`; preserve launcher command/rootless args and provider ownership. | A missing argument would silently revert local MCP to `kanmer-board`; no shell or installer behavior should change. |
| `apps/gui/src/main/index.ts` | Pass the current saved `kanmerBranch` from the Connect IPC handler. | The setting, not an observed stale branch after a refused handoff, is the expected convention agents must compare. |
| `apps/gui/src/main/providers.test.ts` | Add branch-env serialization and default/portable assertions across provider config merges. | Proves no absolute path or root pin returns while the custom convention is retained. |
| `apps/gui/src/main/connect.test.ts` | Test configured branch propagation through invocation and Connect seams. | Prevents a GUI IPC/registration regression after the registry change. |

## Managed instructions and governing docs

| File | Planned change | Risk / reason |
|---|---|---|
| `scripts/agents-block-body.mjs` | State local registration/export requirements and distinguish hosted Actions mirroring from local inheritance. | This is the canonical managed body. |
| `AGENTS.md` | Regenerate the managed block with `scripts/agents-block.mjs`. | The repo's own instructions must match the canonical body. |
| `plugins/kanmer/skills/kanmer-setup/SKILL.md` | Update the fenced managed block byte-for-byte with the canonical body. | Plugin users without this checkout receive the same convention. |
| `docs/functional/frd/FRD-012-connect.md` | Amend the Codex portable-registration requirement to permit only the project-scoped branch env alongside the fixed rootless launcher. | The current R1e says env is omitted; leaving it stale would contradict the fix. |

## Context files an implementer must read

| Context | Why |
|---|---|
| `docs/functional/frd/FRD-020-board-git-worktree-sync.md` | Defines the configurable board branch and paired GUI/MCP inspectors. |
| `docs/architecture/adr/ADR-0016-compiled-workflow.md` | Keeps GitHub protection/Actions and local readiness separate; no API or protected-ref mutation. |
| `docs/functional/frd/FRD-012-connect.md` | Defines provider-owned registration shape and Codex portability constraints. |
| `packages/mcp-server/src/index.ts` | Existing `KANMER_BOARD_BRANCH` consumer and expected-branch report. |
| `scripts/verify-agents-block.mjs` | Exact managed-body synchronization gate. |

## Explicit non-goals

No branch rename/reconciliation changes, GitHub API/App, workflow gate logic, installer/shim changes, MCP tool additions, plugin manifest changes, provider ownership changes, dependencies, or CORE-043 edits.
