# Post-implementation report

## Outcome

MCP-015 moves Antigravity to the user-scoped native Kanmer plugin and enables background dispatch through the shared provider registry. New Connect runs validate the plugin bundle, run the host's supported status command, require a fresh bound functional get_status proof, and only then retire Kanmer-owned legacy .agents state. Dispatch uses exactly agy --add-dir <sourceRoot> -p <task prompt>; it does not depend on cwd, .mcp.json, a machine path, or a persistent project id.

## Implementation

- packages/core/src/dispatch-providers.ts and its tests add the antigravity provider and hostile Windows-root argv coverage.
- apps/gui/src/main/providers.ts and connect.ts reuse the native plugin lifecycle for Grok and Antigravity, add Antigravity validation/capability/functional hooks, and preserve legacy cleanup safety.
- apps/gui/src/main/connect.test.ts and providers.test.ts cover successful and failed Antigravity lifecycle behavior; failed functional proof leaves legacy state unchanged.
- plugins/kanmer/plugin.json and plugins/kanmer/mcp_config.json provide the native descriptor. The MCP entry is node plus \${PLUGIN_ROOT}/mcp/kanmer-mcp.cjs, with no cwd or root flags.
- scripts/check-plugin-sync.mjs, the MCP provider description, Settings UI, release note, FRD/ADR/manual docs, and generated manual were updated to keep the host-specific contract and no-generic-config rule synchronized.

## Verification

- Commit: dd83db29.
- Pull request: #152, https://github.com/collisionengineers/kanmer/pull/152; left open for independent review. gh pr checks reported no checks on the branch at handoff.
- Full core: npm test -w @kanmer/core — 13 files, 267 tests passed.
- Full GUI deterministic: npm test -w @kanmer/gui -- --no-file-parallelism — 38 files, 356 tests passed. Focused providers/connect/dispatch passed 97/97; focused connect passed 29/29.
- All-workspace typecheck passed. MCP HTTP tests passed 61/61. Script tests passed 82/82.
- plugin:check, verify:docs, verify:agents-block, verify:skills, and check:manual passed.
- packages/mcp-server/src/smoke.mjs passed 224/224; smoke:protocol passed 46/46; smoke:discovery passed 13/13.
- Read-only agy plugin validate plugins/kanmer on agy 1.1.14 passed, reporting 12 skills and 1 MCP. mcp_config.json SHA-256 is A9999F8144C46FE2D16A0226B3C1738FFB6FB0638589505DBF0468D657646541.

The ordinary parallel full GUI command was run twice and preserved the exact runner-only cleanup failure: disconnect peer safety > retains the shared block when another copy-skills host has malformed registration timed out at 5,000 ms with EBUSY: resource busy or locked, rmdir 'C:\Users\Alex\AppData\Local\Temp\kanmer-connect-OTwCPj' (the first run used kanmer-connect-sJOvuW). The focused 29/29 suite and serialized full suite passed; no implementation assertion failed.

## External evidence and disposition

The installed CLI is agy 1.1.14. No disposable authorized host project or credentials were available, so real plugin install, uninstall, a bound get_status tool call, and an unbound control were not run. That host-proof lane is explicitly INCONCLUSIVE. No capability claim is inferred from PONG, process start, plugin list, or descriptor validation. The implementation is ready for independent review; do not merge this PR in this lane.

### 2026-08-22 hosted verify failure preserved

Exact hosted evidence from verify run 32549912338/job 96974849841: the authoritative npm test reached the GUI suite and reported three failures, all from legacy Antigravity disconnect fixtures invoking disconnectAgent("antigravity", root) without a command-runner seam. Each failure was AssertionError: expected false to be true // Object.is equality, with Expected true and Received false, at apps/gui/src/main/connect.test.ts lines 159, 308, and 503. The exact test names were:

- registration ownership (GUI-079) > a Claude-only .mcp.json no longer makes grok count as a connected host
- disconnect peer safety > retains the shared block when another copy-skills host has malformed registration
- disconnect and provider-specific project skill directories > removes Antigravity's copy without touching OpenCode's copy

Hosted totals were Test Files 1 failed | 38 passed (39), Tests 3 failed | 358 passed (361). The runner had no agy executable, so the native plugin list command returned ok:false before legacy cleanup. This was a fixture portability failure, not a weakened assertion or a product fallback. Remediation uses the existing ConnectCommandRunner seam with an explicit No imported plugins. response; production still fails closed when agy is unavailable.

### 2026-08-22 bounded hosted-failure remediation

Commit 16f91003 changes only apps/gui/src/main/connect.test.ts. The three legacy Antigravity disconnect fixtures now inject the existing ConnectCommandRunner seam and model the supported absent-plugin output No imported plugins. This preserves the production fail-closed behavior when agy is unavailable and does not weaken any assertion.

Rerun evidence: focused connect.test.ts passed 29/29; standard full GUI run by itself passed 38 files and 356 tests; serialized full GUI with --no-file-parallelism passed 38 files and 356 tests; all-workspace typecheck passed. The earlier hosted failure remains recorded verbatim in scratch/hosted-verify and the post-implementation report. PR #152 is now at head 16f91003 and awaits hosted verify rerun.

### 2026-08-22 hosted verify rerun

Hosted PR verification passed after the fixture remediation: run 32550191640, job 96975552621, check verify, conclusion pass, duration 2m27s. The PR remains open and unmerged at head 16f91003.

### 2026-08-22 automated review findings and bounded dispositions

The following six unresolved automated review threads were preserved before the remediation pass. They are all in scope for this PR and remain open until the fresh head is independently gathered:

1. P1, scripts/release.mjs pluginManifestPaths: “Add the Antigravity manifest to the release bump list.” The release source of truth omitted plugins/kanmer/plugin.json, allowing release/plugin:check version drift.
2. P1, plugins/kanmer/mcp_config.json: “Ship a runtime for the Antigravity MCP command.” A hardcoded node command is not valid for packaged installs whose supported runtime is Electron-as-Node and which do not require a separate Node installation.
3. P2, .gitignore: “Keep legacy Antigravity state ignored during migration.” Existing .agents/mcp_config.json and .agents/skills residue must remain machine-local and ignored until reconnect cleanup has proven ownership.
4. P1, apps/gui/src/main/providers.ts functional proof: “Verify board data instead of a disclosed static marker.” A failed tool call or model echo containing KANMER_GET_STATUS_OK must not authorize legacy cleanup.
5. P1, apps/gui/src/main/providers.ts/connect.ts command execution: “Pass Antigravity arguments without a shell.” q() interpolation was unsafe for paths containing $(), backticks, &, and ;.
6. P1, apps/gui/src/main/providers.ts / AGENTS.md: “Document new native plugin convention in AGENTS.md.” The root Antigravity manifest, native lifecycle, runtime convention, and release source of truth must be documented in the same PR.

Bounded dispositions implemented in this remediation: (1) release.mjs now bumps all three shipped plugin manifests and release-manifests.test.mjs pins that source of truth; (2) Antigravity mcp_config.json now launches the existing installer-owned Windows \`%LOCALAPPDATA%\\Kanmer\\bin\\kanmer-mcp.cmd\` through cmd.exe, and Connect preflights that launcher rather than node; (3) .gitignore restores both legacy .agents paths; (4) cleanup requires a fresh machine-checkable get_status identity containing the exact project fingerprint, canonical board root, repo root, and storage format, so markers/PONG/echoes fail closed; (5) Antigravity lifecycle commands use execFile argv, with hostile-root regression coverage; (6) AGENTS.md records the root manifest, launcher and lifecycle convention. No provider behavior outside the bounded native plugin path was changed.

The real agy host lane remains INCONCLUSIVE: no disposable authorized plugin project or credentials are available. No install/uninstall/functional capability is inferred from list, validation, process start, marker output, or fixture output.

### 2026-08-22 fresh remediation head

Bounded review remediation is committed and pushed as b487516b (PR #152, branch mcp-015-antigravity-plugin-dispatch). It addresses all six preserved automated findings: release source-of-truth/test for the root Antigravity manifest; installer-owned Windows launcher in mcp_config plus launcher preflight; restored ignored .agents migration residue; exact project fingerprint/board-root/repo-root/format proof instead of a marker; execFile argv lifecycle commands with hostile-root coverage; and AGENTS.md native-plugin convention documentation.

Local evidence after b487516b: focused GUI providers/connect 94/94; serialized full GUI 38 files, 356 tests; all-workspace typecheck passed; scripts 83/83 including release-manifests.test.mjs; plugin-sync OK (34 tools, bundle bytes, 12 skill frontmatters, manifests v0.3.3); verify:docs, verify:agents-block 31/31, verify:skills, check:manual passed; build passed; protocol smoke 46/46; discovery smoke 13/13; git diff --check passed.

Hosted verify rerun is pending on the pushed head. PR #152 remains open and unmerged for independent review. The exact prior hosted failure and all six thread texts remain above in scratch/hosted-verify and scratch/review; the real agy install/functional host lane remains explicitly INCONCLUSIVE and no capability is inferred from fixtures or marker output.

### 2026-08-22 fresh review findings F-008 through F-010

Independent fresh review found these additional unresolved threads against b487516b; all are preserved verbatim in substance and are now bounded remediation scope:

- F-008: “dispatch true but DispatchSupervisor marks any exit 0 done without terminal Kanmer deliverable.” A successful CLI exit is not proof that the named task deliverable exists; the GUI also allowed a no-task whole-ticket dispatch.
- F-009: “retireLegacyPluginState only checks copy-skills peers; can drop AGENTS block while Claude/Codex marketplace/project hosts remain.” Shared instructions must remain while any connected host still owns the project registration.
- F-010: “functional --add-dir proof can load legacy .agents registration when boardRoot==projectRoot; must isolate/disable legacy during proof and restore on failure.” A native plugin proof must not be satisfied by the registration it is meant to retire; both Antigravity and Grok legacy configs are isolated byte-for-byte and restored before cleanup or on failure.

Bounded dispositions: DispatchSupervisor now requires an injected deliverable verifier for named tasks before reporting exit-0 "done"; failed/unavailable/unproven deliverables become failed with explicit reasons. The GUI refuses unscoped dispatch and both GUI/MCP supervisors verify the shared task deliverable against ticket docs/checklist/PR evidence. Connect's shared-peer check now includes CLI/config and legacy native registrations, and the functional probe disables any owned legacy registration for the duration of the probe, restoring exact bytes in a finally path. Regression tests cover unscoped dispatch, unproven/no verifier exits, Claude peer retention, and Antigravity/Grok legacy isolation.

### 2026-08-22 fresh GraphQL review findings F-011 through F-014

Independent fresh review of PR 152 at fdeae1b0 found these additional current threads; the prior F-001 through F-010 dispositions remain in the earlier review sections:

- F-011 (blocking/P1): Grok's functional get_status probe still used a shell-interpolated command, so a hostile project root could alter command interpretation.
- F-012 (blocking/P1): expectedProjectIdentity hardcoded and capped the storage format at literal 3 instead of deriving the current format from core.
- F-013 (blocking/P2): FRD-012 still described the Antigravity descriptor as node plus the PLUGIN_ROOT token, contrary to the installer-owned launcher now shipped.
- F-014 (blocking/P2): README still said Connect writes the legacy .agents/mcp_config.json registration for Antigravity.

Disposition: F-011 fixed with Grok's argv-native lifecycle/functional commands and a hostile-root argv regression assertion; injected command runners remain only deterministic test seams. F-012 fixed by importing core CURRENT_FORMAT and clamping version.json values against that source of truth while retaining legacy 1/2 detection, with a format-2 functional identity regression. F-013 fixed by aligning FRD-012's descriptor, launcher matrix, token explanation, and MCP-015 route text with cmd.exe and %LOCALAPPDATA%\\Kanmer\\bin\\kanmer-mcp.cmd. F-014 fixed by documenting that native Antigravity owns skills/MCP and .agents paths are migration residue only. No real host install/tool claim is added; the authorized-host proof remains INCONCLUSIVE.

Fresh commit and hosted verify rerun are pending. PR 152 stays open at Review; no merge.

### 2026-08-22 final remediation head 25c932e7

F-011 through F-014 are fixed in 25c932e7 (PR #152): Grok functional lifecycle commands use argv-native execution; expectedProjectIdentity imports core CURRENT_FORMAT and retains legacy format detection; FRD-012 describes the installer-owned cmd.exe/%LOCALAPPDATA% launcher; and README documents native plugin MCP with .agents paths as migration residue only. The earlier F-001 through F-010 review findings and exact hosted failure remain preserved in the preceding scratch sections.

Local evidence on the final head: focused GUI providers/connect/dispatch 98/98; isolated DispatchSupervisor 6/6; all-workspace typecheck passed; core/server build and plugin build passed; plugin:check passed with 34 tools, byte-current bundle, 12 skill frontmatters and v0.3.3 manifests; git diff --check passed. The prior serialized GUI rail was 38 files/357 tests on the immediately preceding remediation head; the final source changes are limited to the focused provider/connect/docs surface.

Hosted verify PASS for final head: run 32552010309, job 96980185214, verify completed successfully (Pull request verification, PR #152). The prior remediation head also passed as run 32551740679/job 96979506490. The real agy install and bound functional host proof remains explicitly INCONCLUSIVE because no authorized disposable host/credentials were available; no capability is inferred from validation, list, inspect, or fixtures.

PR #152 remains open and unmerged for independent review. MCP-015 remains at Review.
