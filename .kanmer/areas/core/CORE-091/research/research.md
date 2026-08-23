# CORE-091 research

## Question

Why does the merged-main verification stop at `mcpb:check`, and what is the smallest safe remediation?

## Evidence inspected

- `scripts/build-plugin.mjs` copies only `packages/mcp-server/dist/standalone/kanmer-mcp.cjs` to `plugins/kanmer/mcp/kanmer-mcp.cjs` after a normal `npm run build`.
- `scripts/check-plugin-sync.mjs` compares the committed plugin bytes with the fresh standalone output, refuses a checkout whose `@kanmer/core` resolves outside that checkout, and also checks tool names, isolated handshake, skill frontmatter, manifests, and marketplace packaging.
- `scripts/build-mcpb.mjs` stages the fresh standalone server, canonical icon, and generated manifest; `scripts/check-mcpb-sync.mjs` validates the MCPB and compares both the staged server and committed plugin bytes.
- The standalone tsup config bundles the server/core into deterministic CJS and declares that its output is the byte-parity contract.

## Reproduced failure

On the current merged source, `plugins/kanmer/mcp/kanmer-mcp.cjs` hashes to `AE7A3C11F64A5941819813F83E5F52B29E2DEB7EF8F7672BD7DD8EEAF4C49CDE`, while the freshly built standalone output hashes to `C59056ACF3CDEF99D078AF02E2FAAF3F796E2EA13C18506E18E963DCD44E7941`. The full `npm run verify` therefore reached the MCPB rail and failed with `MCPB server differs from distributed plugin copy`.

## Scope conclusion

The defect is a stale committed generated artifact, not a source behavior defect. The fix is one generated-file refresh from a normal checkout, followed by the existing parity checks. No source code, test assertion, dependency, manifest, or provider behavior should change.

## Open questions

None. The source-of-truth and repair command are explicit in the repository scripts; external provider/runtime evidence is outside this artifact-only ticket.
