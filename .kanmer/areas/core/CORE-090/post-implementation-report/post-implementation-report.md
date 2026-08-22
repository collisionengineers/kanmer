# Post-implementation report

Implementation commit: `a4204617` on `core-090-mcpb-refresh`; PR #220 targets
`core-026-project-declared-sources`.

Evidence:

- The cumulative source tree at CORE-026 head `973bcf93` was rebuilt with
  `npm run plugin:build` from its normal worktree, producing the committed
  `plugins/kanmer/mcp/kanmer-mcp.cjs` artifact.
- `npm run mcpb:check` passed in that cumulative worktree (`3 files`,
  `1657309 bytes`); the diff on this ticket is artifact-only.
- A linked worktree without its own workspace junction cannot run the same
  build independently; that limitation is preserved rather than claimed as a
  second pass.

## Remediation after independent review — clean artifact provenance

The committed artifact mismatch was reproduced and corrected from an ordinary detached checkout of cumulative source head `973bcf9340aa2c627c717a00f1bcf0f6d3fca242`, with its own `npm ci` (exit 0). In that checkout:

- `npm run plugin:build` — exit 0.
- `npm run mcpb:check` — exit 0; check reports 3 files / 1,671,293 bytes and server SHA-256 `f52d9c5b3817b12432e211438913146908c32874bf74ac261839a21ee31ea58c`.
- The regenerated `plugins/kanmer/mcp/kanmer-mcp.cjs` is the only copied change; its SHA-256 is `f52d9c5b3817b12432e211438913146908c32874bf74ac261839a21ee31ea58c`, size 1,594,808 bytes. The prior committed artifact was `7298b5c268ac5995cadd56f6bbd4bcbe301f97a6a72eddd2f53d64a346158d75`, size 1,590,774 bytes.
- Re-running `npm run mcpb:check` from the linked ticket worktree remains exit 1: its standalone build resolves the primary-checkout `@kanmer/core/dist` and reports missing exports (`SourceDeclarationSchema`, `withExclusiveFileLock`, `resolveSources`, `SourceDeclarationArraySchema`, `dispatchDeliverableProven`). This linked-worktree failure is preserved as INCONCLUSIVE/environment evidence, not treated as a pass.

The artifact-only diff is ready for fresh independent review; merged-main proof remains unwritten.
