# Post-implementation report — MCP-014

## Outcome

Grok Connect now uses Grok's native user-scoped kanmer plugin. The provider no longer writes a new project .grok/config.toml registration or copies skills into .grok/skills. It preflights grok --version, grok plugin --help, the inherited Node runtime (or KANMER_NODE), and the packaged/dev plugin bundle; installs with grok plugin install <pluginRoot> --trust; requires grok inspect to show an enabled Kanmer plugin with skills and MCP; invokes a fresh grok -p get_status probe; and only then retires Kanmer-owned legacy state. Disconnect warns in the renderer that the plugin is user-scoped, verifies list/inspect absence, then performs the same surgical legacy cleanup. Grok dispatch remains unchanged.

## Files changed

- apps/gui/src/main/providers.ts: explicit none registration and plugin install contract; Grok command builders and legacy ownership.
- apps/gui/src/main/connect.ts: ordered preflight/install/inspect/tool proof, rollback-before-cleanup behavior, user-plugin disconnect, plugin status, and injectable command/root seams.
- apps/gui/src/main/connect.test.ts, providers.test.ts, skillsVersion.test.ts: command fixtures, migration preservation/rollback, provider and status assertions.
- apps/gui/src/shared/ipc.ts and Settings UI: plugin status type and user-scope confirmation/copy.
- FRD-012, manual source/generated chapter, and release notes updated.

## Evidence

- Grok host probes: grok 1.0.5 (5115b46bc9) [stable]; plugin/help, install help, uninstall help, list, inspect, install and uninstall were run. Install exited 0 and reported Installed 1 plugin(s) ... kanmer; inspect reported kanmer (user, enabled) 12 skills, 1 MCPs; uninstall exited 0 and list then reported no plugins.
- The host's inspect output still reports Kanmer after uninstall because the pre-existing user config contains [plugins] enabled = [kanmer]; that user setting was not changed. No XAI_API_KEY was available, so a fresh Grok get_status invocation was not executable. Real functional host acceptance is therefore INCONCLUSIVE, not PASS; the output is recorded in MCP-014 scratch.
- Injected lifecycle fixture proves command order: CLI/help/runtime → bundle validation → install → inspect capability → fresh functional get_status marker → legacy TOML unmerge, stamped-roster removal, and AGENTS peer reconciliation. Inspect/tool failure leaves the legacy config and skills untouched.

## Checks

- PASS: npx vitest run apps/gui/src/main/providers.test.ts apps/gui/src/main/connect.test.ts apps/gui/src/main/skillsVersion.test.ts — 95 tests.
- PASS: npm test -w @kanmer/gui — 37 files, 350 tests.
- PASS: npm run typecheck -w @kanmer/gui.
- PASS: npm run build (core + MCP server standalone).
- PASS: npm run check:manual, npm run verify:skills, and git diff --check.
- INCONCLUSIVE: npm run plugin:check from this linked worktree refused because its local workspace dependency resolved to the main checkout; root-main should run the guard after integration.

## Scope/deviations

No changes were made to MCP-015, other provider dispatch/registration, the plugin manifest/descriptor, global environment/PATH, or .gitignore Grok legacy ignores. The real Grok tool proof remains the explicit external-host blocker; do not claim Done until an authenticated clean-project proof can invoke get_status and post-uninstall state is unambiguous.

## Review handoff

Implementation is ready for independent review; do not self-merge. Review should inspect the native plugin command contract, rollback ordering, user-scope warning, and the INCONCLUSIVE external proof disposition.
