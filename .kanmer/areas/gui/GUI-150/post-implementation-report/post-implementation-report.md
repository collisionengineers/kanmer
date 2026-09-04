# Post-implementation report — GUI-150

## Files changed

| Path | Change |
|---|---|
| `apps/gui/src/main/providers.ts` | `MarketplacePluginState` type; `MarketplaceVersionCheck.parse` returns it; `parseMarketplacePluginState` (JSON-first over the `--json` array, text-transcript fallback extended with `Status:`/`Error:` lines); Claude's check command `claude plugin list --json` |
| `apps/gui/src/main/connect.ts` | `verifyInstalledMarketplaceVersion`: absent → version mismatch → load error / disabled (new, quoting the host's `errors` and the same repair); `readMarketplacePluginState`; `SkillsStatus.hostError`; `skillsStatus` sets `hostError` and `updateAvailable` for a failed or disabled plugin |
| `apps/gui/src/shared/ipc.ts` | `SkillsStatus.hostError: string \| null` |
| `apps/gui/src/renderer/src/components/Settings.tsx` | version hint only when the version differs; `· plugin failed to load: <error>` hint with the full error in the title; "Update skills" title names the re-install |
| `apps/gui/src/main/connect.test.ts` | `pluginListJson()` fixture in the real `--json` shape; parse tests for JSON (healthy, errors, disabled, absent, other plugin, two scopes, missing `enabled`) and text fallback (`Status: ✘ disabled`, `Error:`); Connect fails on `errors[]` with the repair and the host's words, fails on `enabled:false`, passes on healthy JSON; `skillsStatus` `hostError`/`updateAvailable` for failed, disabled and healthy |
| `docs/functional/frd/FRD-012-connect.md` | R1 GUI-150 amendment |

## Commands and exit codes

| Command | cwd | Exit | Result |
|---|---|---|---|
| `npm ci` | `.worktrees/gui-150` | 0 | dependencies installed |
| `npm run test -w @kanmer/gui` | `.worktrees/gui-150` | 1 → 0 | first run: 552/553 (one new parse assertion targeted the wrong transcript block); after the fix `npx vitest run src/main/connect.test.ts` 64/64 and the rail's `npm test` 553/553 |
| `npm run typecheck` | `.worktrees/gui-150` | 2 → 0 | first run: two `SkillsStatus` literals lacked `hostError` (`connect.ts` project-scope return, `packages/ui/src/demo.tsx`); fixed, then clean across all four workspaces |
| `npm run verify` (default `TMP`; MCP-056 is in this tree) | `.worktrees/gui-150` | 0 | PASS, 13 steps, ending `plugin-sync OK — 41 tools match, bundle bytes match`; 54 files / 553 tests (`C:/kt-tmp/gui150/verify2.log`; `verify1.log` is an aborted launch from the wrong cwd, not evidence) |

## Deviations from the plan

- `packages/ui/src/demo.tsx` was not in the plan's Expected files: it is the `@kanmer/ui` workspace's demo API and carries a `SkillsStatus` literal, so the added field had to land there too (one line, `hostError: null`).
- The version hint in Settings now renders only when the installed and bundled versions differ, so a plugin at the right version that failed to load shows the load-error hint alone rather than a misleading `v0.4.1 → 0.4.1`.

## Not verified here

Real-host acceptance (point the staged marketplace at a deleted directory, Connect → `ok:false` quoting `cache-miss`; Settings shows the error; repair clears both) needs an installed build carrying this commit; owed at the 0.4.1 promotion acceptance (CORE-137), with GUI-147's and GUI-149's.

## PR
https://github.com/collisionengineers/kanmer/pull/317 — head `26c5337721534cac6defcc8d652734ef9498dc73`
