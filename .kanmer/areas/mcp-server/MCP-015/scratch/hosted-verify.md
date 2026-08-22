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
