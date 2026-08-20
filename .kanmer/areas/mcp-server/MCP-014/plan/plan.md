# Plan — MCP-014: Install Kanmer into Grok as a native plugin

## Objective

Replace Grok’s Kanmer-owned project `.grok/config.toml` registration and copied `.grok/skills` roster with Grok’s supported user-scoped plugin lifecycle, while proving an actual Kanmer tool works, preserving rollback until success, keeping Disconnect symmetric and leaving every unrelated provider/file unchanged.

## Starting state

- Grok provider is `configFile` + `copySkills` and dispatchable.
- GUI-079 already gave Grok its own config file; GUI-080 added stamped copied-roster cleanup.
- The shipped Kanmer plugin already advertises 12 skills and the one Grok/Claude-compatible MCP descriptor.
- Real Grok 0.2.111 commands in the ticket prove plugin install/inspect exists; FRD-012 records a real tool call and the Node/`KANMER_NODE` runtime caveat.
- `grok mcp list` is explicitly unreliable and must not enter production/status/tests.

## Approach

Add the smallest explicit plugin-managed provider path. Preflight the CLI and runtime, install the plugin, inspect it and invoke `get_status` from a clean project before deleting any working legacy project state. Then surgically remove only Kanmer’s old Grok config/skills. Disconnect warns that the plugin is user-scoped, uninstalls it through Grok, verifies removal and cleans residual owned legacy state. Do not change dispatch or build a generic hypothetical framework.

## Governing docs

- **FRD-012 — Modifies.** Update provider matrix, user-scoped plugin/runtime/migration/disconnect and real-oracle acceptance.
- **ADR-0009 — Meets.** Claims are proven by actual CLI/tool invocation, not tool listings or copied docs.
- **ADR-0012 — Meets.** Plugin MCP keeps no cwd/`--root`; project board discovery comes from Grok session cwd.
- **MCP-014 ticket measurements — Inputs.** Re-run/pin exact supported CLI before implementation; do not silently assume output stability.
- **GUI-079/080 — Preserve.** Reuse surgical unmerge/stamped-roster cleanup for migration only.

## Required changes

### 1. Re-verify the supported Grok contract

1. On the implementation machine, record `grok --version` and require the supported minimum/exact tested range.
2. Run and capture `grok plugin --help`, install help, uninstall help, plugin list and inspect help/output.
3. Determine/pin the exact uninstall identifier and whether install is idempotent/update-in-place; put real outputs in test fixtures.
4. Run a positive-control temporary plugin if necessary so parser tests distinguish command failure from no plugin.
5. Confirm `grok mcp list` still disagrees with active plugin MCP and add a fixture/test forbidding its use as the oracle.
6. Verify the shipped `plugin.json`/`claude.mcp.json` is the exact tree Grok consumes.

### 2. Add the plugin-managed provider shape

7. Extend provider types with one explicit plugin-managed lifecycle that says the plugin provides both MCP and skills.
8. Include pure builders/fields for install command(s), uninstall command(s), installed/inspection probe and user-scope description.
9. Keep existing `cli`, `configFile`, `marketplace` and `copySkills` semantics unchanged.
10. Configure Grok with:
    - install `grok plugin install <absolute pluginRoot> --trust`;
    - verified uninstall command;
    - verified list/inspect probes;
    - no project registration merge/unmerge for new Connect;
    - no copied skills destination;
    - unchanged dispatch flag/CLI/args.
11. Quote plugin root through the existing command-quoting helper and use packaged/dev `pluginRoot()` exactly once.
12. Add provider tests for exact commands, user scope, no project outputs and unchanged other providers.

### 3. Add runtime/capability preflight

13. Before any plugin mutation or legacy cleanup, verify Grok CLI/plugin subcommands execute.
14. Resolve plugin MCP runtime availability without mutating global state:
    - if `KANMER_NODE` is set, validate it exists/executes the bundle contract;
    - otherwise run `node --version` through the same environment Grok will inherit.
15. If neither is available, return `ok:false` with exact setup/restart guidance and change zero project/plugin bytes.
16. Validate the packaged/dev plugin root contains manifest, skills and bundled MCP descriptor/server.
17. Do not run `setx`, edit PATH, persist environment, substitute an absolute config registration or copy skills as fallback.
18. Keep these probes injectable so unit tests use fixtures, not the operator’s real Grok install.

### 4. Install and verify before migration cleanup

19. Run the exact Grok plugin install command from the project/source cwd and capture stdout/stderr/exit.
20. Stop on non-zero and preserve all legacy state.
21. Run the verified plugin installed-state/`grok inspect` command and parse pinned output; require Kanmer enabled with expected skills and one MCP.
22. Create/use a clean verification project with no `.grok/config.toml` Kanmer entry, no `.mcp.json` Kanmer entry and no other Connect registration that could satisfy the call.
23. Launch a fresh Grok session from that project with the same runtime environment and a controlled prompt that must invoke Kanmer `get_status` and return machine-checkable fields.
24. Assert the actual tool call succeeds, resolves the verification project/board through cwd discovery and reports the plugin bundle/server identity.
25. Treat inspect-without-tool, a call from a competing registration or a proxy tool listing as failure.
26. Record the install/probe/tool outputs in Connect result/report; redact secrets but retain executable evidence.

### 5. Migrate owned project residue only after success

27. After step 24 succeeds, inspect `<project>/.grok/config.toml`.
28. If present/readable, use existing pure TOML unmerge to remove only `mcp_servers.kanmer`; preserve all other bytes/values as serializer semantics allow.
29. If unreadable, report migration warning and leave the file rather than truncate it; the verified plugin remains installed.
30. Inspect the old `.grok/skills` stamped roster.
31. Use `removeBundledSkillsOnly`/roster ownership to remove only Kanmer-owned copied skills/stamp; preserve user-authored folders/files.
32. Recalculate copy-skills peers without Grok and remove/retain the managed AGENTS block according to remaining OpenCode/Antigravity registration.
33. Remove `.grok` config/skill directories only when empty and owned cleanup permits; never recursively delete user content.
34. Return one Connect result that states plugin installed/verified and names any retained legacy warning.
35. Run Connect again and prove plugin install/update verification is idempotent and no project config/skills are recreated.

### 6. Implement symmetric user-scoped Disconnect

36. Before uninstall, return/display a clear warning/confirmation that the Grok plugin is user-scoped and removal affects all Grok workspaces for that user.
37. Do not describe the operation as project-only.
38. Run the verified plugin uninstall command from a safe cwd.
39. On non-zero, return failure and do not claim disconnected; preserve/record state for repair.
40. Run plugin list/inspect and require Kanmer absent/disabled according to pinned output.
41. Clean any remaining owned legacy `.grok/config.toml` entry and stamped `.grok/skills` as in migration, preserving unrelated state.
42. Reconcile AGENTS block based only on remaining copy-skills providers.
43. Run Disconnect again and define/test idempotent already-absent behavior.
44. Confirm Claude `.mcp.json`, OpenCode/Antigravity configs/skills, plugin manifests and dispatch settings are byte-identical.

### 7. Update status/skill-update behavior

45. Change `skillsStatus` so Grok is marketplace/plugin-managed: no project copied-version/update affordance.
46. Ensure Connect UI/provider list labels it accurately and does not offer copied-skills update.
47. If current connected-state UI depends only on project registration, add a narrow async plugin state adapter using pinned `plugin list`/inspect output; do not call `grok mcp list`.
48. Distinguish `registered`, `absent` and `indeterminate` on command/parse failure; do not collapse inability to inspect into disconnected.
49. Avoid repeated expensive CLI probes during render; use existing refresh/actions or a bounded cached main-process query only if needed.

### 8. Retire no-longer-generated ignore/prose

50. After all code/tests/real proof establish no new `.grok/config.toml`/`.grok/skills` writes, remove only their `.gitignore` entries/comment claims.
51. Update provider ignore/roster tests so every still-generated artifact remains protected.
52. Keep legacy cleanup code/path knowledge even though the paths are no longer generated.
53. Amend FRD-012 provider/runtime matrix and acceptance:
    - native user plugin supplies skills+MCP;
    - runtime precondition;
    - inspect + real tool oracle;
    - no `mcp list`;
    - migration-after-success;
    - user-scoped disconnect;
    - unchanged dispatch/discovery.
54. Update manual and release notes with runtime setup, one Connect migration, global uninstall effect and repair commands; regenerate manual.

### 9. Tests and real proof

55. Add pure parser fixtures from real plugin list/inspect install/absent/malformed outputs.
56. Add Connect tests for preflight failure zero writes, install failure rollback, inspect failure rollback, tool-call failure rollback and successful ordered cleanup.
57. Assert legacy config/skills cleanup is surgical and user-authored/other-provider bytes survive.
58. Assert reconnect and disconnect are idempotent.
59. Assert Grok copied skill status/update UI disappears and provider matrix/dispatch remain unchanged.
60. Extend `check-plugin-sync` for Grok-consumed manifest/MCP runtime/no-cwd/no-root and provider installation assumptions.
61. Run a real clean-project sequence:
    - record no competing registrations;
    - Connect/install;
    - `grok inspect`;
    - fresh Grok `get_status` tool call;
    - verify no project config/copied skills;
    - Disconnect/uninstall;
    - inspect and failed/absent tool result;
    - residual file census.
62. Test both Node-on-PATH and configured `KANMER_NODE` where safe; if only one can be executed, mark the other explicitly unverified rather than claiming it.
63. Run full GUI/core/tests/typecheck/plugin/manual rails and diff/status checks.

## Expected files

Modify files in `files.md`; optionally add `grok-plugin.ts` and its test only to keep real-output parsing/lifecycle isolated.

## Do not modify

- Other provider registration/install/dispatch, plugin discovery/root contract, global environment/PATH, MCP transport/tools, consumer Git or unrelated plugin files.
- Delete legacy state before real tool success.
- Trust `grok mcp list` or advertise project-scoped disconnect.
- Begin MCP-015.

## Acceptance checks

- Grok native plugin install is preflighted, installed and verified by inspect plus a real tool call.
- No new `.grok/config.toml` or copied skill roster is produced.
- Existing owned legacy state is removed only after plugin success and unrelated state survives.
- Runtime absence fails actionably with zero migration.
- Reconnect is idempotent; Disconnect is explicitly user-scoped, symmetric and verified.
- Other providers and Grok dispatch remain unchanged.
- FRD/manual/release/plugin rails match measured behavior.

## Verification commands

```bash
npm run test -w @kanmer/gui
npm run test -w @kanmer/core
npm test
npm run typecheck
npm run plugin:check
npm run check:manual
npm run verify:skills
git diff --check
git status --short
```

Real Grok proof uses the exact supported CLI/help/install/list/inspect/uninstall and a fresh `get_status` invocation recorded in the report.

## Failure and deviation rules

- If supported Grok CLI output differs, update measured fixtures/commands before implementation; do not parse by wishful regex.
- If plugin cannot launch a real tool in the inherited environment, leave legacy state and stop; do not call install complete.
- If user-scoped uninstall is unacceptable to product owner, stop for rescope rather than keep hidden dual ownership.
- If another provider regresses, correct the narrow provider branch; do not broaden the plugin abstraction.
- Do not merge or start MCP-015.

## Stop condition

Stop when Grok Connect/Disconnect use only the verified native user-plugin lifecycle; install is proven by a real isolated tool call; legacy cleanup is ordered and surgical; runtime/user-scope effects are explicit; all provider/plugin/manual rails pass; and the PR is ready for independent review. Do not merge or begin another ticket.
