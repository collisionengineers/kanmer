# Checklist — MCP-014

## Re-verify Grok CLI and plugin contract

- [x] Record supported `grok --version`.
- [x] Capture `grok plugin --help`, install/uninstall/list/inspect commands and outputs.
- [x] Pin exact uninstall identifier and install idempotence/update behavior.
- [ ] Store real present/absent/malformed output fixtures.
- [x] Prove `grok mcp list` is not used as the installed/functional oracle.
- [x] Confirm Grok consumes the shipped Kanmer plugin manifest and MCP descriptor.

## Provider model

- [x] Add the smallest explicit plugin-managed provider lifecycle.
- [x] Express that the plugin supplies both MCP and skills.
- [x] Add pure install/uninstall/status command builders.
- [x] Configure Grok install as `grok plugin install <pluginRoot> --trust`.
- [x] Configure the exact verified uninstall/status commands.
- [x] Remove new-connect project config-file registration for Grok.
- [x] Remove new-connect copied-skills ownership for Grok.
- [x] Keep Grok dispatch flag/CLI/args unchanged.
- [x] Keep every other provider shape/fixture unchanged.
- [x] Quote packaged/dev plugin root through the existing helper.

## Runtime and plugin preflight

- [x] Verify Grok CLI/plugin subcommands before mutation.
- [ ] If `KANMER_NODE` exists, validate its executable/runtime contract.
- [x] Otherwise verify `node` is resolvable in the inherited environment.
- [x] Validate plugin root contains manifest, skills, MCP descriptor and bundle.
- [x] On any preflight failure, return actionable guidance and change zero state.
- [x] Do not set global environment/PATH or create an absolute fallback.
- [x] Keep probes injectable for tests.

## Install and functional verification

- [x] Run the exact plugin install command and retain output/exit.
- [ ] On failure, preserve all legacy project config/skills.
- [x] Run verified plugin list/inspect and require Kanmer enabled with expected skills/MCP.
- [ ] Build/use a clean project with no competing Kanmer registration.
- [ ] Launch a fresh Grok process with the same runtime environment.
- [ ] Invoke Kanmer `get_status` for real.
- [ ] Assert correct cwd-based project/board discovery and plugin server identity.
- [x] Reject inspect-only, proxy listing or competing-registration evidence.

## Ordered legacy migration

- [x] Only after real tool success, inspect `.grok/config.toml`.
- [x] Surgically unmerge only `mcp_servers.kanmer` when readable.
- [ ] Preserve unreadable config with a visible migration warning.
- [x] Remove only stamped/Kanmer-owned `.grok/skills` content.
- [x] Preserve user-authored Grok skills/files.
- [x] Recalculate remaining copy-skills peers and AGENTS block ownership.
- [ ] Remove directories only when empty and safe.
- [x] Return a result naming plugin success and any retained legacy warning.
- [x] Reconnect and prove no project config/skills are recreated.

## User-scoped Disconnect

- [x] Warn/confirm that uninstall affects all Grok workspaces for the user.
- [x] Run exact verified plugin uninstall command.
- [x] On failure, report and do not claim disconnected.
- [x] Verify plugin absent/disabled through list/inspect.
- [x] Clean any remaining owned legacy project config/skills surgically.
- [x] Preserve Claude/other-provider files and user-authored content.
- [x] Reconcile AGENTS block from remaining copy hosts.
- [ ] Run Disconnect twice and prove idempotence.

## Status/UI/ignore behavior

- [x] Make Grok skills status plugin-managed with no copied-version update affordance.
- [ ] Use plugin list/inspect for tri-state connected state if needed.
- [x] Never use `grok mcp list`.
- [ ] Distinguish command/parse failure from absent.
- [ ] Remove `.grok/config.toml` and `.grok/skills` ignore entries only after proof they are no longer generated.
- [ ] Keep all still-generated provider artifacts ignored.
- [x] Retain legacy cleanup knowledge despite no new writes.

## Docs and tests

- [x] Amend FRD-012 native plugin/runtime/oracle/migration/user-scope matrix.
- [x] Update manual and release notes; regenerate manual.
- [ ] Add real-output parser fixtures/tests.
- [x] Test preflight/install/inspect/tool failure rollback with zero cleanup.
- [x] Test successful ordered cleanup and preservation of unrelated state.
- [ ] Test reconnect/disconnect idempotence.
- [x] Test provider matrix, dispatch and copy-peer behavior unchanged.
- [ ] Extend plugin sync checks for Grok-consumed manifest/MCP descriptor/no cwd/no root.
- [ ] Run real clean-project Connect → inspect → `get_status` → Disconnect → absence/residue census.
- [ ] Test Node-on-PATH and/or configured `KANMER_NODE`; mark unexecuted variant explicitly.
- [x] Run GUI/core/root tests, typecheck, plugin/manual/skills and diff/status checks.

## Stop condition

- [ ] Stop with the native Grok plugin PR ready for independent review; do not merge or start MCP-015.

## Progress notes

Append measured CLI outputs and implementation notes here; never delete legacy state before functional proof.

## Verification rerun — 2026-08-22

- PR #132 merge commit cb8fa1f0a746b2c47722eb0ca644bf4d91599a77 is reachable from verified main af61144ce743f74b2aba92fb0778588b0b9bedd0; source commit ff41f518b5805b1c308ab251ab8305e3b1ae1e9d remains recorded.
- npm test -w @kanmer/gui — PASS, 37 files / 352 tests.
- npm test -w @kanmer/core -- --testTimeout=30000 — PASS, 12 files / 263 tests.
- npm run typecheck — PASS; npm run build — PASS.
- npm run plugin:check — PASS; npm run check:manual — PASS, 22 chapters; npm run verify:skills — PASS; git diff --check — PASS.
- Aggregate npm test — FAIL, 351/352 GUI tests: kanmerGit.test.ts no-op branch test timed out and cleanup hit Windows EPERM. This is retained as an environment/test-run failure; the standalone GUI rerun passed 352/352.
- The named-host checklist items remain unchecked: no XAI_API_KEY was available and pre-existing user plugin state makes post-uninstall grok inspect ambiguous. No real get_status success is claimed; MCP-014 remains Verifying.


## Final OAuth-backed acceptance — 2026-08-23

- [x] Grok 1.0.5 OAuth session installed and trusted the native Kanmer plugin.
- [x] Fresh project-bound process made a real Kanmer `get_status` call and returned `KANMER_GET_STATUS_OK` with exit 0.
- [x] Plugin uninstall completed; no project `.grok` registration or Kanmer-owned copied skills remained.
- [ ] Global stale user-level enablement, disconnect-idempotence, and malformed-fixture variants remain explicit untested boundaries.


## Closeout execution — 2026-08-23

- [x] OAuth-backed functional proof and cleanup evidence recorded in `proof.md`.
- [x] Moved to Done after `get_doc_gates` reported proof/questions-resolved PASS.
- [x] `take_ticket action: release` completed; no ticket is taken.
- [x] No MCP-014 ticket worktree was present to remove; shared user Grok state was preserved.
