# GUI-113 files

## Production

- `apps/gui/src/main/connect.ts` — provider-owned registration reconciliation; disposable native plugin descriptor staging; branch argument propagation.
- `apps/gui/src/main/index.ts` — invoke reconciliation after a successful branch save/rename and expose failure in the existing Git status; keep protected refusal and unrelated contexts untouched.
- `plugins/kanmer/mcp/claude.mcp.json` — document the branch environment contract for Grok/Claude-compatible native descriptors.
- `plugins/kanmer/mcp_config.json` — document the branch environment contract for Antigravity's native descriptor.

## Tests

- `apps/gui/src/main/connect.test.ts` — registration ownership/rewrite and native Grok/Antigravity descriptor propagation, including custom and hostile branch values.
- `apps/gui/src/main/index.sync.test.ts` — production saved-preference caller invokes reconciliation only for matching successful contexts and surfaces failures/refusals.

## Explicitly out of scope

No changes to `packages/core`, MCP server root discovery, GitHub Actions/protection, unrelated project contexts, provider install/uninstall semantics, or user-global settings beyond the existing saved branch preference.
