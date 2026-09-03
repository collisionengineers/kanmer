# Files — GUI-149

Verified against `origin/main` `cd5b6b6b` (2026-09-03).

| Action | Path | Responsibility |
|---|---|---|
| Modify | `packages/core/src/staleness.ts` | Rename `CODEX_PORTABLE_*` → `PORTABLE_LAUNCHER_*` (aliases kept); generalise `isCurrentCodexRegistration()` into a legacy-descriptor check that also reads `.mcp.json` / `opencode.json`; wire into `registrationRows()` |
| Modify | `packages/core/src/staleness.test.ts` | Legacy JSON descriptor → `behind`; portable → no row |
| Modify | `apps/gui/src/main/providers.ts` | `portableLauncherInvocation()` (alias `codexPortableInvocation`), `connectIgnoreEntries(provider)` |
| Modify | `apps/gui/src/main/connect.ts` | `serverInvocation()` returns the portable contract for codex/claude/opencode; delete `installedElectronInvocation()`; probe gates all three; call `ensureConnectIgnore()` after registration and in `reconcileProviderRegistration()`; Claude approval note |
| Add | `apps/gui/src/main/gitIgnore.ts` | `ensureIgnore()` + `ignoreEntriesToAppend()` moved out of `kanmerGit.ts` (shared) |
| Modify | `apps/gui/src/main/kanmerGit.ts` | Import the moved helper; no behaviour change |
| Modify | `apps/gui/src/main/providers.test.ts` | Portable assertions for claude argv / `mcpServersMerge` / `opencodeMerge`; retire the Electron-shape codex case |
| Modify | `apps/gui/src/main/connect.test.ts` | `serverInvocation` parity for the three ids; probe gates all three; gitignore append once / not without `.git`; grok assertion on `process.execPath` revisited |
| Modify | `apps/gui/src/main/index.sync.test.ts` | Added during execution: the branch-change reconcile caller test asserted the Electron env shape for `.mcp.json`; now asserts the portable one |
| Modify | `apps/gui/src/renderer/src/manual/chapters.generated.ts` | Regenerated from `docs/manual/connect.md` (`npm run build:manual`) |
| Modify | `plugins/kanmer/mcp/kanmer-mcp.cjs` | Regenerated committed server bundle (`npm run plugin:build`) because core changed; required by `mcpb:check`. Listed under Do-not-modify in the plan; see the post-implementation report |
| Modify | `docs/functional/frd/FRD-012-connect.md` | R1, R1c, R1e, R7 amendments |
| Modify | `AGENTS.md` | §8 "registered MCP command path can go stale" gotcha rewritten; Connect gitignore behaviour noted |
| Modify | `.gitignore` | Comment block: paths are per-machine opt-in, no longer "hardcode absolute paths" |
| Modify | `docs/manual/connect.md` | Claude/OpenCode rows name the launcher |

## Do not modify
- `plugins/kanmer/**` (plugin descriptors, skills), `.claude-plugin/**`, `.agents/**`
- Grok / Antigravity native-plugin paths in `connect.ts` / `providers.ts`
- `apps/gui/src/main/index.ts` (signature of `serverInvocation` is preserved so no caller changes)
- The installed launcher `kanmer-mcp.cmd` / installer NSIS scripts
