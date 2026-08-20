# Plan — MCP-015: Install Kanmer into Antigravity as a plugin and enable bound dispatch

## Objective

Use Antigravity’s native user-scoped plugin lifecycle for Kanmer skills and MCP, migrate away from project-written Antigravity state only after a real bound tool call succeeds, and enable background dispatch exclusively through an ephemeral `--add-dir <sourceRoot>` binding so every launched agent can actually see the intended board.

## Starting state

- GUI-073 is Done and proves project `.agents` inputs work only in an explicitly bound `agy` session; bare cwd is irrelevant.
- `agy -p` works with piped stdout, so dispatch is feasible.
- Current Antigravity provider writes `.agents/mcp_config.json`, copies `.agents/skills` and leaves dispatch false.
- MCP-016 removed the broken generic plugin MCP advertisement; current repository needs a documented Antigravity-specific plugin MCP descriptor.
- MCP-014 should provide the explicit plugin-managed provider lifecycle; MCP-020 should provide shared dispatch provider/supervisor ownership. Reuse whichever has landed; do not duplicate.

## Approach

Re-measure the supported CLI/plugin descriptor, add the documented root `mcp_config.json`, preflight runtime, install/validate the user plugin and invoke `get_status` from a clean `agy --add-dir` session. Only then surgically remove Kanmer-owned legacy `.agents` state. Add Antigravity to the shared dispatch provider registry with bound args in the same change as real task/tool proof. Disconnect is explicitly user-scoped and symmetric. Settings/manual describe binding and scope accurately.

## Governing docs

- **FRD-012 — Modifies.** Native plugin install, exact Antigravity descriptor/runtime, bound interactive session, migration and global uninstall.
- **FRD-010 — Modifies.** Antigravity dispatch uses `--add-dir` and real Kanmer-deliverable acceptance.
- **ADR-0009 — Modifies the open consequence only.** Preserve mechanism-not-proxy lesson; record that MCP-015 establishes plugin/binding.
- **GUI-073 evidence — Governing implementation input.** Binding facts are settled and must not be reinterpreted.
- **MCP-014/MCP-020 — Reuse.** One plugin lifecycle and one dispatch SSOT/supervisor.

## Required changes

### 1. Re-verify Antigravity’s supported plugin and binding surface

1. Record `agy --version`; require the supported tested minimum/range.
2. Capture `agy --help`, plugin validate/install/list/inspect/uninstall help and output.
3. Confirm exact accepted `--add-dir` spelling/order with a positive-control workspace skill/MCP fixture.
4. Run the same control without binding and assert it fails to see workspace capability.
5. Verify a bound workspace MCP is reachable only through an actual tool call, not a named-tool grep.
6. Verify which plugin-root variable Antigravity expands in `mcp_config.json` and whether `node` launches the bundled server.
7. Test candidate descriptor against `agy plugin validate`/install and a clean real tool call before committing it.
8. Store exact output fixtures; do not parse undocumented prose without a pinned supported version.

### 2. Add the Antigravity-specific plugin MCP descriptor

9. Add `plugins/kanmer/mcp_config.json` using the documented `{mcpServers:{...}}` shape.
10. Set server name exactly `kanmer`.
11. Use only the verified portable runtime and plugin-root token; expected initial form is `command:"node"`, args `["${PLUGIN_ROOT}/mcp/kanmer-mcp.cjs"]`.
12. Include no `cwd`, `--root`, `--repo-root`, source/install/user path or shell fallback.
13. Do not restore `plugins/kanmer/.mcp.json` or add an Antigravity server to the Codex manifest.
14. Ensure the plugin package contains the bundled server and all 12 skill folders.
15. Validate every skill frontmatter through Antigravity-compatible YAML parsing; fix only genuine parser-invalid metadata and add a rail so it cannot regress.
16. Extend plugin-sync checks to require the new descriptor and reject `.mcp.json`, cwd/root/machine paths and missing bundle/skills.

### 3. Reuse/extend the plugin-managed provider lifecycle

17. Depend on MCP-014’s plugin-managed provider type/adapter if landed.
18. Configure Antigravity install as the exact `agy plugin install <pluginRoot>` command (plus only measured required flags).
19. Configure exact user-plugin uninstall/list/validate/inspect commands.
20. Mark install scope/user-impact explicitly in provider metadata/result.
21. Remove new-connect project config registration and copied-skills ownership for Antigravity.
22. Preserve legacy unmerge/roster cleanup functions as migration helpers, not active outputs.
23. Keep every other provider byte/command/ownership unchanged.

### 4. Preflight before mutation

24. Verify `agy` and required plugin subcommands are available.
25. Verify `node` runtime in the environment future `agy` sessions inherit, or the exact alternate runtime form established in step 6.
26. Validate plugin tree/descriptor/bundle/skills before install.
27. On any preflight failure, return exact remediation and change zero plugin/project bytes.
28. Do not set PATH/environment globally, create a project config fallback or copy skills.
29. Keep probes injectable/fixture-driven in unit tests.

### 5. Install and functionally prove the plugin

30. Run plugin install and retain command/stdout/stderr/exit.
31. Run plugin validate/list/inspect and require Kanmer plugin enabled with expected 12 skills and one MCP source.
32. Create/use a clean verification repository with no Kanmer `.agents/mcp_config.json`, global MCP config or competing plugin/Connect entry.
33. Run a negative bare `agy -p` control and confirm it cannot use the workspace board.
34. Run `agy --add-dir <sourceRoot> -p <controlled prompt>` in the same environment.
35. Require the prompt to invoke Kanmer `get_status` and return machine-checkable project/server fields.
36. Assert correct source/board discovery and plugin server identity.
37. Confirm the tool came from plugin `mcp_config.json`, not a residual workspace/global entry.
38. Treat install/inspect/PONG/tool-list without the real call as failure and preserve legacy state.

### 6. Migrate legacy project state only after success

39. Inspect `<project>/.agents/mcp_config.json`; remove only owned `mcpServers.kanmer` using the existing pure unmerge if readable.
40. Preserve unreadable files with a visible migration warning rather than truncating.
41. Inspect `.agents/skills` stamped roster and current provider registry.
42. Remove only Kanmer-owned copied folders no longer needed by any connected provider; preserve user-authored and other-provider/shared-tree ownership.
43. Reconcile managed AGENTS block according to remaining providers and GUI-088’s eventual all-provider contract.
44. Remove empty owned files/directories only when safe.
45. Return a result naming plugin installed/verified, binding command and any retained legacy state.
46. Reconnect and prove idempotent plugin verification with no project-state recreation.

### 7. Add bound Antigravity dispatch

47. Add Antigravity to the shared dispatch provider SSOT from MCP-020 (or establish that approved SSOT if landing order requires).
48. Set CLI exactly `agy`.
49. Set args to the real-verified equivalent of `--add-dir <sourceRoot> -p <taskPrompt>`; include a bounded print timeout only if existing dispatch timeout and real CLI behavior require it, with one source of timeout truth.
50. Never rely on cwd alone, use bare `agy`, create/persist `--new-project` or store `--project` ids.
51. Set provider `dispatch:true` only in the same diff.
52. Ensure GUI dispatch menu/badge derive from the shared flag and Antigravity appears exactly once.
53. Preserve MCP-020 policy allowlisting: Antigravity is eligible only after the shared registry update and operator allowlist permits it.
54. Unit-test exact args/quoting for roots with spaces/metacharacters/Unicode.
55. Unit-test no unbound Antigravity dispatch path exists.
56. With fake process, pin stdout/stderr/exit/cancel/timeout behavior through the shared supervisor.
57. Run a real task-scoped dispatch in a clean project and require the agent to call Kanmer and create/read the named ticket deliverable.
58. Verify the terminal dispatch status/audit belongs to the correct project/ticket.
59. Run a negative deliberately unbound control and retain the failed capability result to prove binding is causal.

### 8. Implement symmetric user-scoped Disconnect

60. Warn/confirm that uninstall removes Kanmer from all Antigravity workspaces for the current user.
61. Run the exact plugin uninstall command.
62. On failure, return failure and do not claim disconnected.
63. Verify plugin absent/disabled via validated list/inspect output.
64. Clean any remaining owned legacy project MCP/skills surgically, preserving shared/user data.
65. Reconcile AGENTS block based on remaining providers.
66. Run Disconnect twice and define/test idempotent already-absent behavior.
67. After uninstall, run a bound fresh session and assert Kanmer capability is absent; do not use tool-list grep alone.

### 9. Update UI, docs and migration guidance

68. Update provider row/copy so Antigravity no longer shows no-dispatch and is described as user-plugin installed.
69. Retain an explicit CLI note: interactive `agy` requires `--add-dir <project>` or a user-managed bound project; bare CLI remains blind.
70. State the Antigravity IDE was not proven by the CLI test.
71. Remove old wording that Connect writes only inside the project for every provider; distinguish user-scoped Grok/Antigravity plugins from project-local registrations.
72. Update skill-update UI so plugin-managed Antigravity has no copied-skills version affordance.
73. Update `.gitignore` only according to actual remaining writers: remove `.agents/mcp_config.json` if none; retain `.agents/skills/` if another provider still writes it.
74. Update provider/ignore tests to pin exact ownership.
75. Amend FRD-012, FRD-010 and ADR-0009 as described.
76. Update manual/release notes with install/runtime/binding/dispatch/migration/global-uninstall behavior and regenerate manual.

### 10. Verification and plugin packaging

77. Add real-output parser/command tests for installed/absent/malformed plugin and bound/unbound sessions.
78. Test every preflight/install/validate/tool failure leaves legacy state untouched.
79. Test successful ordered cleanup preserves unrelated/shared `.agents` state.
80. Test reconnect/disconnect idempotence and user-scope warning.
81. Test all 12 skills parse/load through plugin validation/real inspect.
82. Test exact bound dispatch args, menu status and actual Kanmer deliverable.
83. Assert every other provider’s Connect/install/dispatch fixtures remain unchanged.
84. Run GUI/core/root tests, typecheck, plugin sync, manual/skills checks and diff/status checks.
85. Rebuild packaged plugin bytes only through the normal build/check route if descriptor/bundle distribution requires it.
86. Record CLI version/help, plugin descriptor hash, install/validate/inspect, bound/unbound tool calls, real dispatch, uninstall and residue census in report.

## Expected files

Add/modify the exact files in `files.md`; use focused Antigravity adapter/tests only where real-output parsing would otherwise bloat `connect.ts`.

## Do not modify

- Reintroduce `.mcp.json`, persist project ids, trust cwd alone, set global runtime config, remove shared `.agents` content, claim IDE support, or alter unrelated providers/transport/storage.
- Flip dispatch without the bound args and real Kanmer task proof.
- Begin MCP-008.

## Acceptance checks

- Native plugin validates/installs all 12 skills and one working MCP descriptor.
- Bound fresh session calls `get_status`; unbound control does not.
- Legacy project state is removed only after functional success and shared/unrelated state survives.
- Antigravity dispatch uses `--add-dir` from the shared registry and completes a real Kanmer deliverable.
- UI/manual accurately describe user scope and CLI binding; no-dispatch badge is gone.
- Disconnect uninstalls globally, verifies absence and is idempotent.
- Full provider/plugin/manual/tests pass with executable evidence.

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

Plus exact real `agy` validate/install/list/inspect, unbound/bound `get_status`, task-scoped dispatch and uninstall commands recorded in proof.

## Failure and deviation rules

- If plugin-root/runtime tokens differ, pin only the real positive-control form before implementation.
- If a bound real tool call fails, keep legacy state and dispatch false; record commands/output and stop.
- If shared `.agents` ownership is ambiguous, preserve it and report; never delete by assumption.
- If MCP-014/020 contracts have not landed, implement against their approved shared boundary or stop—do not create competing systems.
- Do not merge or start MCP-008.

## Stop condition

Stop when Antigravity’s user plugin is the verified owner of skills/MCP, migration cleanup is rollback-safe, bound `--add-dir` dispatch completes a real Kanmer task, user-scope/binding UI/docs are accurate, all rails pass and the PR is ready for independent review. Do not merge or begin another ticket.
