# Post-implementation report — GUI-119

## Scope and lineage

GUI-119 addresses only the three provider branch-propagation findings linked from CORE-043: OpenAI tunnel registration, remote-access child processes, and Claude marketplace installation/update. The implementation is based on parent head `1126253eed586111db60ed72eccf6754f0f5ef06` in branch `gui-119-provider-branch-propagation` and worktree `.worktrees/gui-119`. No CORE-043 source or board worktree files were edited.

## Implementation

- Electron startup now supplies `readSettings().kanmerBranch` to both the OpenAI tunnel invocation factory and `RemoteAccessManager`.
- OpenAI's existing `serverInvocation` path therefore emits the selected `KANMER_BOARD_BRANCH` for the Claude MCP target, retaining its existing normalized default.
- Remote runtime and doctor children receive the same branch through a shared environment helper; blank settings retain `kanmer-board`.
- Claude marketplace Connect and Update skills stage only the marketplace manifests and `plugins/kanmer` into a temporary directory, patch the staged `claude.mcp.json` branch env, execute the provider-owned marketplace commands against that source, and remove the staging directory. The shipped bundle and user-global marketplace state are not mutated.
- The regression uses branch text `team&whoami` and reads the staged descriptor, proving the value is carried as data and not interpreted as shell syntax.

## Rails

| Check | Result |
|---|---|
| Focused GUI provider rail (connect, remote manager, OpenAI tunnel) | PASS — 3 files / 56 tests, exit 0 |
| Standalone connect rail | PASS — 35/35, exit 0 |
| GUI typecheck | PASS, exit 0 |
| GUI build | PASS, exit 0 (electron-vite; existing gray-matter eval warning only) |
| Manual freshness | PASS — 22 chapters |
| Governing docs verification | PASS |
| Scripts rail | PASS — 89/89 after worktree-local core build |
| Diff check | PASS |

The first scripts attempt exited 1 because the fresh worktree had no `packages/core/dist`; this setup failure is preserved. `npm run build:core` followed by the same scripts command exited 0 with 89/89. The initial full GUI attempt exited 1 when the new marketplace test exceeded Vitest's 5s default while staging a whole repository; the implementation then narrowed staging to required marketplace-owned roots and added a 30s test budget. A later full attempt reached all files but did not return its final summary and was stopped; it is INCONCLUSIVE, not PASS. Focused and standalone rails are the authoritative deterministic evidence for this bounded lane.

## External evidence boundary

No disposable Windows host, installed Claude marketplace, OpenAI tunnel service, remote cloudflared tunnel, or protected live board was available. Installed-state/provider lifecycle and live branch handoff remain INCONCLUSIVE; no claims are made for them.

## Handoff

The implementation is ready for an independent review. The author will not self-review, merge, verify, or clean up. The PR must target `core-043-protection-retarget` and record the final commit/PR after push.
