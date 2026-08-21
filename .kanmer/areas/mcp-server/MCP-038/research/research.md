# MCP-038 research

Merged-main verification of MCP-025 ran npm run plugin:check before a fresh plugin build and found the committed standalone bundle differed from the canonical output only in js-yaml module path comments. npm run plugin:build regenerated plugins/kanmer/mcp/kanmer-mcp.cjs; plugin:check then passed with 30 tools, 12 skill frontmatters, manifest v0.3.3, and isolated MCP handshake.

This is a generated-artifact repair, not a source behavior change.
