# Checklist — MCP-015

## Re-verify Antigravity contract

- [ ] Record supported `agy --version`.
- [ ] Capture CLI, plugin validate/install/list/inspect/uninstall help/output.
- [ ] Verify exact `--add-dir` syntax/order with positive-control workspace MCP/skill.
- [ ] Run the same control unbound and prove absence.
- [ ] Prove workspace MCP through an actual tool call, not a named-tool list.
- [ ] Verify the exact plugin-root/runtime token form Antigravity expands.
- [ ] Store real output fixtures and supported-version assumptions.

## Plugin descriptor and package

- [ ] Add documented `plugins/kanmer/mcp_config.json`.
- [ ] Define only `mcpServers.kanmer` with verified portable runtime/plugin-root path.
- [ ] Include no cwd, root flags or machine paths.
- [ ] Do not re-add `.mcp.json` or a Codex manifest server.
- [ ] Confirm bundle and all 12 skills are packaged.
- [ ] Validate all skill frontmatter with Antigravity-compatible YAML.
- [ ] Add/extend a rail preventing invalid skill metadata.
- [ ] Extend plugin sync to require descriptor and reject broken forms.

## Plugin-managed provider lifecycle

- [ ] Reuse MCP-014’s explicit plugin-managed provider contract.
- [ ] Configure exact `agy plugin install <pluginRoot>` and uninstall/status commands.
- [ ] Mark user/all-workspaces scope explicitly.
- [ ] Remove new project `.agents/mcp_config.json` registration.
- [ ] Remove new copied `.agents/skills` ownership.
- [ ] Preserve legacy cleanup helpers only for migration.
- [ ] Keep every other provider unchanged.

## Preflight and functional install

- [ ] Verify `agy`/plugin subcommands before mutation.
- [ ] Verify runtime available in future `agy` environment.
- [ ] Validate plugin tree/descriptor/bundle/skills.
- [ ] On failure, change zero plugin/project state and provide exact remediation.
- [ ] Do not persist PATH/environment or create project fallback.
- [ ] Run plugin install and retain stdout/stderr/exit.
- [ ] Require validate/list/inspect to show enabled plugin, 12 skills and one MCP.
- [ ] Use a clean project with no competing Kanmer registration.
- [ ] Run negative bare `agy` control.
- [ ] Run bound `agy --add-dir <sourceRoot>` and invoke `get_status`.
- [ ] Assert correct project/board and plugin server identity.
- [ ] Prove capability source is the plugin descriptor.
- [ ] Treat PONG/inspect/tool listing without real call as failure.

## Ordered legacy cleanup

- [ ] Only after bound tool success, surgically unmerge owned `.agents/mcp_config.json` entry.
- [ ] Preserve unreadable config with visible warning.
- [ ] Inspect stamped `.agents/skills` and current shared ownership.
- [ ] Remove only Kanmer-owned copied folders no longer needed by any provider.
- [ ] Preserve user-authored/shared provider data.
- [ ] Reconcile managed AGENTS block from remaining provider contracts.
- [ ] Remove empty owned files/directories only when safe.
- [ ] Reconnect and prove no project state is recreated.

## Bound dispatch

- [ ] Add Antigravity to MCP-020’s shared dispatch provider SSOT.
- [ ] Set CLI exactly `agy`.
- [ ] Set args to verified `--add-dir <sourceRoot> -p <prompt>` form.
- [ ] Use no bare cwd, `--new-project` or stored project id.
- [ ] Set `dispatch:true` in the same change.
- [ ] Prove GUI menu/badge derive from the same provider flag.
- [ ] Prove MCP policy sees it only through shared registry/allowlist.
- [ ] Test roots with spaces/metacharacters/Unicode.
- [ ] Test no unbound dispatch path exists.
- [ ] Test fake process lifecycle through shared supervisor.
- [ ] Run real task-scoped dispatch and require a Kanmer tool/deliverable.
- [ ] Assert dispatch audit/status is bound to correct project/ticket.
- [ ] Retain negative unbound control proving binding causality.

## User-scoped Disconnect

- [ ] Warn/confirm all-workspaces impact.
- [ ] Run exact plugin uninstall command.
- [ ] On failure, report and do not claim disconnected.
- [ ] Verify plugin absent via validated list/inspect.
- [ ] Clean only owned residual legacy project state.
- [ ] Preserve shared/user content and reconcile AGENTS block.
- [ ] Run Disconnect twice and prove idempotence.
- [ ] Run bound fresh session after uninstall and prove Kanmer absent via mechanism.

## UI, docs and ownership

- [ ] Remove no-background-dispatch badge through provider state.
- [ ] Update Connect copy for native user plugin scope.
- [ ] Retain exact interactive `--add-dir`/user-managed project guidance.
- [ ] State CLI-only evidence; do not claim IDE verification.
- [ ] Remove false claim that every provider writes only inside project.
- [ ] Remove copied-skills update affordance for Antigravity.
- [ ] Update `.gitignore` only after checking actual remaining writers.
- [ ] Preserve `.agents/skills` ignore if another provider still writes it.
- [ ] Update provider/ignore tests.
- [ ] Amend FRD-012, FRD-010 and ADR-0009.
- [ ] Update manual/release notes and regenerate manual.

## Verification

- [ ] Test present/absent/malformed plugin output parsers.
- [ ] Test every preflight/install/validate/tool failure preserves legacy state.
- [ ] Test successful cleanup preserves unrelated/shared `.agents` state.
- [ ] Test reconnect/disconnect idempotence and scope warning.
- [ ] Test all 12 skills parse/load.
- [ ] Test exact bound dispatch menu/args/real deliverable.
- [ ] Assert every other provider fixture unchanged.
- [ ] Run GUI/core/root tests and typecheck.
- [ ] Run plugin/manual/skills checks.
- [ ] Run diff/status checks.
- [ ] Record CLI/version, descriptor hash, install/inspect, bound/unbound tool calls, dispatch, uninstall and residue census.

## Stop condition

- [ ] Stop with the plugin/bound-dispatch PR ready for independent review; do not merge or start MCP-008.

## Progress notes

Append measured commands and implementation notes here; never flip dispatch before bound tool proof.

## 2026-08-22 implementation evidence

- [x] Native Antigravity plugin descriptor, provider lifecycle, bound dispatch argv, docs, and synchronization checks implemented in commit dd83db29.
- [x] Deterministic unit, focused GUI, full core, serialized full GUI, typecheck, HTTP, scripts, plugin, docs, skills, and smoke rails recorded in post-implementation-report.md.
- [ ] Real Antigravity install, bound tool call, unbound control, and uninstall remain explicitly INCONCLUSIVE because no disposable authorized host/credentials were available; this is not inferred from proxy output.

### 2026-08-22 hosted remediation

- [x] Injected the existing command-runner seam into all three legacy Antigravity disconnect fixtures; production unavailable-CLI behavior remains fail-closed.
- [x] Focused connect 29/29, standard full GUI 38/356, serialized full GUI 38/356, and all-workspace typecheck passed after commit 16f91003.
- [ ] Hosted verify rerun is pending on PR #152; no merge performed.

- [x] Hosted verify rerun passed: run 32550191640, job 96975552621, verify, 2m27s; PR #152 remains open and unmerged.

### 2026-08-22 automated review remediation

- [x] Preserved all six unresolved automated review findings and their dispositions in scratch/review and the post-implementation report.
- [x] Added the root Antigravity manifest to release version source-of-truth coverage with a regression test.
- [x] Switched Antigravity MCP config/runtime preflight to the installer-owned Windows launcher.
- [x] Restored ignored legacy .agents migration paths.
- [x] Replaced marker-only functional proof with exact project-identity proof and a marker-echo regression.
- [x] Routed Antigravity lifecycle commands through argv and covered hostile path arguments.
- [x] Documented the native plugin convention in AGENTS.md.
- [ ] Fresh commit, hosted verify rerun, and independent review remain pending.

### 2026-08-22 fresh head b487516b

- [x] All six automated review findings fixed or dispositioned in the bounded MCP-015 scope; exact thread text preserved in scratch/review.
- [x] Local remediation rails passed: GUI 94/94 focused and 38 files/356 serialized; typecheck; scripts 83/83; plugin/docs/skills/manual; build; protocol 46/46; discovery 13/13; diff-check.
- [ ] Hosted verify rerun on PR #152 head b487516b is pending; leave the PR open for independent review.

### 2026-08-22 F-008–F-010 remediation

- [x] Require and verify named Kanmer deliverables before exit-0 dispatches become done; reject no-task GUI dispatch.
- [x] Retain AGENTS.md while any CLI/config or legacy native host registration remains connected.
- [x] Isolate and byte-restore Grok/Antigravity legacy registrations around functional proof.
- [x] Regression tests cover all three findings and failure/restore paths.
- [ ] Fresh commit and hosted verify rerun pending; PR remains open for independent review.

### 2026-08-22 F-011-F-014 remediation

- [x] Grok functional proof uses argv-native execution and hostile roots stay data, not shell syntax.
- [x] Project identity derives its storage format from core CURRENT_FORMAT and tests a legacy format.
- [x] FRD-012 describes the installer-owned Antigravity launcher and no PLUGIN_ROOT target.
- [x] README describes native plugin MCP and legacy-only .agents migration paths.
- [ ] Fresh commit and hosted verify rerun pending; PR remains open for independent review.
