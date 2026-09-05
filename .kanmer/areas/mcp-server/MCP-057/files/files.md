## Expected files

- `plugins/kanmer/skills/kanmer-verify/SKILL.md`
- `packages/core/src/proof-receipts.ts` (new)
- `packages/core/src/proof-receipts.test.ts` (new)
- `packages/core/src/index.ts`
- `packages/core/src/types.ts`
- `packages/core/src/reconciliation.ts`
- `packages/mcp-server/src/reconciliation.ts`
- `packages/mcp-server/src/reconciliation.test.mjs`
- `docs/manual/proof.md`
- `docs/functional/frd/FRD-006-typed-proof.md`
- `plugins/kanmer/mcp/kanmer-mcp.cjs` (rebuilt bundle only, if server source changed)

## Do not modify

- `scripts/agents-block-body.mjs` and the `kanmer-setup` skill (PR #321 / DOC-028)
- verify-rail scripts touched by PR #322 (CORE-140)
- `packages/mcp-server/src/step-reconciliation.ts` (read only, for context)
- any receipt store, reuse key, ancestry reuse, new MCP tool, or process spawning in core
