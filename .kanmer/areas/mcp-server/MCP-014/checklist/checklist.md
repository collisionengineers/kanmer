# Checklist — MCP-014

## Re-verify Grok CLI and plugin contract

- [ ] Record supported `grok --version`.
- [ ] Capture `grok plugin --help`, install/uninstall/list/inspect commands and outputs.
- [ ] Pin exact uninstall identifier and install idempotence/update behavior.
- [ ] Store real present/absent/malformed output fixtures.
- [ ] Prove `grok mcp list` is not used as the installed/functional oracle.
- [ ] Confirm Grok consumes the shipped Kanmer plugin manifest and MCP descriptor.

## Provider model

- [ ] Add the smallest explicit plugin-managed provider lifecycle.
- [ ] Express that the plugin supplies both MCP and skills.
- [ ] Add pure install/uninstall/status command builders.
- [ ] Configure Grok install as `grok plugin install <pluginRoot> --trust`.
- [ ] Configure the exact verified uninstall/status commands.
- [ ] Remove new-connect project config-file registration for Grok.
- [ ] Remove new-connect copied-skills ownership for Grok.
- [ ] Keep Grok dispatch flag/CLI/args unchanged.
- [ ] Keep every other provider shape/fixture unchanged.
- [ ] Quote packaged/dev plugin root through the existing helper.

## Runtime and plugin preflight

- [ ] Verify Grok CLI/plugin subcommands before mutation.
- [ ] If `KANMER_NODE` exists, validate its executable/runtime contract.
- [ ] Otherwise verify `node` is resolvable in the inherited environment.
- [ ] Validate plugin root contains manifest, skills, MCP descriptor and bundle.
- [ ] On any preflight failure, return actionable guidance and change zero state.
- [ ] Do not set global environment/PATH or create an absolute fallback.
- [ ] Keep probes injectable for tests.

## Install and functional verification

- [ ] Run the exact plugin install command and retain output/exit.
- [ ] On failure, preserve all legacy project config/skills.
- [ ] Run verified plugin list/inspect and require Kanmer enabled with expected skills/MCP.
- [ ] Build/use a clean project with no competing Kanmer registration.
- [ ] Launch a fresh Grok process with the same runtime environment.
- [ ] Invoke Kanmer `get_status` for real.
- [ ] Assert correct cwd-based project/board discovery and plugin server identity.
- [ ] Reject inspect-only, proxy listing or competing-registration evidence.

## Ordered legacy migration

- [ ] Only after real tool success, inspect `.grok/config.toml`.
- [ ] Surgically unmerge only `mcp_servers.kanmer` when readable.
- [ ] Preserve unreadable config with a visible migration warning.
- [ ] Remove only stamped/Kanmer-owned `.grok/skills` content.
- [ ] Preserve user-authored Grok skills/files.
- [ ] Recalculate remaining copy-skills peers and AGENTS block ownership.
- [ ] Remove directories only when empty and safe.
- [ ] Return a result naming plugin success and any retained legacy warning.
- [ ] Reconnect and prove no project config/skills are recreated.

## User-scoped Disconnect

- [ ] Warn/confirm that uninstall affects all Grok workspaces for the user.
- [ ] Run exact verified plugin uninstall command.
- [ ] On failure, report and do not claim disconnected.
- [ ] Verify plugin absent/disabled through list/inspect.
- [ ] Clean any remaining owned legacy project config/skills surgically.
- [ ] Preserve Claude/other-provider files and user-authored content.
- [ ] Reconcile AGENTS block from remaining copy hosts.
- [ ] Run Disconnect twice and prove idempotence.

## Status/UI/ignore behavior

- [ ] Make Grok skills status plugin-managed with no copied-version update affordance.
- [ ] Use plugin list/inspect for tri-state connected state if needed.
- [ ] Never use `grok mcp list`.
- [ ] Distinguish command/parse failure from absent.
- [ ] Remove `.grok/config.toml` and `.grok/skills` ignore entries only after proof they are no longer generated.
- [ ] Keep all still-generated provider artifacts ignored.
- [ ] Retain legacy cleanup knowledge despite no new writes.

## Docs and tests

- [ ] Amend FRD-012 native plugin/runtime/oracle/migration/user-scope matrix.
- [ ] Update manual and release notes; regenerate manual.
- [ ] Add real-output parser fixtures/tests.
- [ ] Test preflight/install/inspect/tool failure rollback with zero cleanup.
- [ ] Test successful ordered cleanup and preservation of unrelated state.
- [ ] Test reconnect/disconnect idempotence.
- [ ] Test provider matrix, dispatch and copy-peer behavior unchanged.
- [ ] Extend plugin sync checks for Grok-consumed manifest/MCP descriptor/no cwd/no root.
- [ ] Run real clean-project Connect → inspect → `get_status` → Disconnect → absence/residue census.
- [ ] Test Node-on-PATH and/or configured `KANMER_NODE`; mark unexecuted variant explicitly.
- [ ] Run GUI/core/root tests, typecheck, plugin/manual/skills and diff/status checks.

## Stop condition

- [ ] Stop with the native Grok plugin PR ready for independent review; do not merge or start MCP-015.

## Progress notes

Append measured CLI outputs and implementation notes here; never delete legacy state before functional proof.
