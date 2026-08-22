# Plan — CORE-085: redirect validators and forced refresh

## Objective

Close automated review findings #3836700730 and #3836700726 on CORE-081 without regressing its seven source lifecycle fixes.

## Starting state

CORE-081 PR #202 head `13b6ce22a8363c0f467e96c775eb9a09891b7bb2` is stacked on `core-026-project-declared-sources` and remains Review/NEEDS-CHANGES. CORE-085 must be implemented on a dedicated branch from that exact head and merged into the CORE-026 branch before a fresh parent review.

## Required changes

1. Do not send cached final-document validators to intermediate redirect hops; attach them only to the effective final URL/cache representation.
2. When a forced caller joins an active refresh, wait for that refresh and then perform/retain the forced revalidation semantics rather than returning an ordinary fresh-cache result silently.
3. Add deterministic tests for multi-hop redirect validator scope and concurrent force behavior.
4. Preserve CORE-081's prior assertions/evidence and refresh cumulative packet traceability.

## Constraints

- Reuse the existing source/cache implementation and no new dependencies.
- No weakening assertions or fabricated external evidence.
- Stop at Review with PR targeting `core-026-project-declared-sources`; independent review/merge required.

## Verification

- `node --test packages/mcp-server/src/sources.test.mjs`
- `npm test -w @kanmer/core`
- `npm run typecheck -w @kanmer/mcp-server`
- `npm run build:server`
- `npm run test:scripts`
- `git diff --check`
