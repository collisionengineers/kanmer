# Environment reconnaissance — 2026-08-21

- `npx wrangler@latest --version` completed with exit 0 and reported `4.125.0`. This confirms Wrangler can be invoked transiently without changing the repository.
- `cloudflared` is not installed or discoverable on PATH (`Get-Command cloudflared` returned NOT_FOUND).
- No Cloudflare tunnel/account/bearer credential variables were present in the process environment; only unrelated `AZURE_MCP_COLLECT_TELEMETRY` was visible.
- No public endpoint, disposable Worker, tunnel, bearer, or protected credential was provisioned or claimed. MCP-028's external proof therefore remains pending; local rails must continue excluding the public integration scenario.
