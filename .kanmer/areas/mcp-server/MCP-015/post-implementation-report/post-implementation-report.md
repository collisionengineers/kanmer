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
