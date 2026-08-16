# Checklist

- [x] `smol-toml` as a devDependency (bundled, not externalised)
- [x] codex `register.kind` → `configFile` at `.codex/config.toml`
- [x] `[mcp_servers.kanmer]` with command, args and env
- [x] merge preserves unknown tables, keys and other servers
- [x] merge idempotent and byte-stable
- [x] unmerge removes only kanmer; drops an emptied `mcp_servers`
- [x] unmerge leaves an unparseable file untouched
- [x] legacy `codex mcp remove kanmer-<project>` on connect **and** disconnect
- [x] trust detection + note surfaced in the connect result
- [x] verified against the real 46-project global config
