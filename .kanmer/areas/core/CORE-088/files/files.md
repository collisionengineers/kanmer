# CORE-088 files and impact

## In scope

- `packages/mcp-server/src/sources.ts`: cache validation/refresh, validator persistence, bounded reads, DNS lookup callback handling.
- `packages/mcp-server/src/sources.test.mjs`: deterministic regressions for cache integrity, stale/forced refresh, 304 metadata, and lookup seams.
- `apps/gui/src/main/kanmerGit.ts`: atomic orphan fingerprint-and-delete transaction.
- `apps/gui/src/main/kanmerGit.test.ts`: deterministic source-edit-before-cleanup regression.
- Cumulative CORE-026 ticket packet and generated artifacts only when required by the normal build.

## Out of scope

Do not change provider registration, GUI source editing, board workflow, unrelated lock semantics, or external/live DNS claims.
