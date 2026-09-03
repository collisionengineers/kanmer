# Plan — GUI-150: Claude Connect verifies only the plugin version, so a plugin that reports failed to load still passes and Settings shows nothing

*The plan. Not the checklist — reasoning establishes bounded work; the checklist distils it into independently observable actions.*

## Objective
Claude Connect fails, with the pasteable repair and the host's own error quoted, when the installed plugin reports a load error or is disabled even at the bundled version; Settings shows the error beside the version so the panel cannot look healthy over `cache-miss`.

## Starting state
`verifyInstalledMarketplaceVersion` (`apps/gui/src/main/connect.ts:693`) runs `claude plugin list` and compares only the parsed `Version:` of the user-scope `kanmer@kanmer` block; on 2026-09-03 the host reported version 0.4.0 with `errors: ["Marketplace kanmer failed to load: cache-miss"]` and the check would have passed. `claude plugin list --json` (claude 2.1.259) returns an array of `{ id, version, scope, enabled, errors? }` entries. Evidence: `files/files.md` (this ticket); `origin/main` at `4d00fbfc`.

## Governing docs
- FRD-012 R1 (GUI-147 amendment): **Modifies** by extension — "requires `claude plugin list` to report the bundled version" becomes "…and to report it loaded and enabled"; recorded as a GUI-150 amendment in the same paragraph. R2's `skillsStatus("claude")` note gains `hostError`.
- No ADR.

## Required changes
1. `providers.ts`: `MarketplaceVersionCheck.parse` returns `MarketplacePluginState | null` = `{ version: string; scope: string; enabled: boolean; errors: string[] }`. New `parseMarketplacePluginState(output, plugin, scope)`: JSON-first (array of entries; pick `id === plugin` at `scope`, else the first match), text fallback through the existing block scanner extended with `Status: ✔ enabled | ✘ disabled` and `Error: …` lines. Claude's check command becomes `claude plugin list --json`.
2. `connect.ts`: `verifyInstalledMarketplaceVersion` keeps the absent and version-mismatch failures, then fails when `errors.length > 0` or `!enabled` with: "The install ran and this host reports plugin v<expected>, but it failed to load: <errors joined>. Run this by hand: <repair>". Success output unchanged. `readMarketplaceInstalledVersion` returns the state; `skillsStatus` sets `installedVersion` from it and `hostError` = first error, or `"plugin disabled"` when `enabled` is false, else `null`; `updateAvailable` is also true when `hostError` is set (the repair is the same reinstall).
3. `ipc.ts` `SkillsStatus.hostError: string | null`.
4. `Settings.tsx`: when `hostError`, a hint `· plugin failed to load: <error>` (title = the full host error) beside the version hint; the "Update skills" button's title explains it re-installs the plugin.
5. Tests as listed in `files/files.md`; `connect.test.ts` existing text-transcript stubs stay valid through the fallback.
6. FRD-012 amendment sentence.

> **Advisory:** `investigate`, `decide`, `choose`, and `determine` usually mean planner work remains. Resolve it before dispatch or use a spike. This is not a gate or regex score.

## Expected files
| Action | Repo-root-relative path | Responsibility |
|---|---|---|
| Modify | `apps/gui/src/main/providers.ts` | state type, JSON-first parser, `--json` command |
| Modify | `apps/gui/src/main/connect.ts` | load/enabled failure, `hostError` in `skillsStatus` |
| Modify | `apps/gui/src/shared/ipc.ts` | `SkillsStatus.hostError` |
| Modify | `apps/gui/src/renderer/src/components/Settings.tsx` | error hint and button title |
| Modify | `apps/gui/src/main/connect.test.ts` | JSON fixtures; failure and status cases |
| Modify | `apps/gui/src/main/providers.test.ts` | command string and parser contract |
| Modify | `docs/functional/frd/FRD-012-connect.md` | amendment |

## Do not modify
`packages/**`, `plugins/**` (no bundle change), Disconnect behaviour (GUI-148), codex/grok/antigravity specs, `kanmerGit.ts`.

## Constraints
- Tests never run a mutating `claude plugin …` command (gotcha 24): stub `hostVersionRunner`, `claudePluginStateDir`, `LOCALAPPDATA`.
- The renderer imports only types from core; `Settings.tsx` reads `SkillsStatus` from `shared/ipc.ts`.
- Keep the text fallback so a host without `--json` still reports a version.

## Ordered steps
1. `providers.ts` state type + parser + command; `providers.test.ts` cases (JSON healthy / errors / disabled / absent / two scopes; text fallback with `Status:`/`Error:`).
2. `connect.ts` verification and status; `ipc.ts` mirror; `connect.test.ts` cases (Connect fails on `errors[]` quoting `cache-miss` with the repair; fails on `enabled:false`; passes on healthy JSON; `skillsStatus.hostError`).
3. `Settings.tsx` hint and title.
4. FRD-012 amendment.
5. `npm run test -w @kanmer/gui`, `npm run typecheck`, full rail `npm run verify` (TMP outside the home folder until MCP-056 merges); commit, push, PR `Kanmer: GUI-150`, post-implementation report, move to Review.

## Acceptance checks
- `connectAgent("claude", …)` with a runner returning JSON carrying `errors: ["Marketplace kanmer failed to load: cache-miss"]` at the bundled version → `ok:false`, `command` = the uninstall+install repair, `output` contains `cache-miss`.
- The same with `enabled:false` → `ok:false`; healthy JSON → `ok:true` with `host reports plugin v<bundled>`.
- `skillsStatus("claude")` → `hostError` set and `updateAvailable` true in the failed case; `null`/false when healthy.
- GUI vitest and typecheck green; full rail green.

## Commands
`npm run test -w @kanmer/gui`; `npm run typecheck`; `TMP='C:\kt-tmp' TEMP='C:\kt-tmp' npm run verify` from the worktree.

## Failure and deviation rules
Stop and report: a need to change Disconnect, any provider other than claude, core/server code, or the bundle; a real `claude` invocation in a test.

## Stop condition
PR open with `Kanmer: GUI-150`, report written, ticket in Review. Do not merge; do not start another ticket.
