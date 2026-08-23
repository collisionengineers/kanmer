# Plan — MCP-046

## Smallest correct change

1. Update plugins/kanmer/mcp_config.json so args[3] is the literal %LOCALAPPDATA%\Kanmer\bin\kanmer-mcp.cmd without JSON-escaped embedded quotes.
2. Extend scripts/check-plugin-sync.mjs to validate the root plugin.json and mcp_config.json native Antigravity descriptor: command cmd.exe; args exactly [/d,/s,/c,<literal path>]; no quote, cwd, --root, absolute path, or extra key; env only KANMER_BOARD_BRANCH.
3. Add or reuse a dependency-free script regression fixture for both the accepted form and the previously failing quoted form.
4. Run plugin:check, the focused script test, diff-check, and the normal build/typecheck rail; retain the real agy bound get_status evidence in proof.

## Boundaries

No GUI provider code, installer logic, Claude/Grok descriptor, board data, new dependency, or API contract changes. The implementation remains a production package artifact consumed by agy plugin install.

## Rollback

Revert the descriptor line and its exact-shape assertion. No user project files or global credentials are touched by the code change.
