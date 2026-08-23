# Files — MCP-046

| Path | Responsibility |
|---|---|
| plugins/kanmer/mcp_config.json | Change only the Antigravity cmd.exe /c launcher argument to the agy-compatible unquoted percent-variable form. |
| scripts/check-plugin-sync.mjs | Assert the native Antigravity descriptor uses cmd.exe, the exact four argv entries, no embedded quotes, no cwd/root/absolute path, and the expected board-branch environment. |
| scripts/check-plugin-sync.test.mjs | Add focused pass/fail coverage if the existing dependency-free script-test conventions expose the checker as a callable seam; otherwise record the executable plugin:check command as the regression. |
