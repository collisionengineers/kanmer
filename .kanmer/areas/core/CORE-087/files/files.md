# Files

- `plugins/kanmer/mcp/kanmer-mcp.cjs` — refresh the committed standalone bundle from a normal checkout.
- `packages/mcp-server/tsup.standalone.config.ts` and build scripts — inspect only if a deterministic build correction is required.
- `CORE-026` cumulative branch — consume the refreshed artifact through its child merge.

The change is limited to the shipped plugin artifact and its reproducible build evidence; no source behaviour or parity assertion is removed.
