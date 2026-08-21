# Plan — MCP-040

## Objective

Restore byte parity between the merged MCP-034 source and the committed standalone plugin artifact.

## Evidence

The first merged-main `npm run verify` passed build, tests, typecheck, stdio/protocol/discovery smoke, skills, and AGENTS checks, then failed at `plugin:check` because `plugins/kanmer/mcp/kanmer-mcp.cjs` differed from a fresh build. Running the canonical `npm run plugin:build` reproduced a single tracked artifact change; `npm run plugin:check` then passed.

## Approach

1. Create the ticket branch from merged main.
2. Run `npm run plugin:build`; retain only the committed `kanmer-mcp.cjs` artifact change.
3. Run `npm run plugin:check`, `npm run verify`, and `git diff --check`.
4. Record the artifact SHA-256, exact command exits, and the prior failed plugin-check as resolved evidence.
5. Stop for independent review; do not merge or write proof before merged-main verification.

## Constraints

No source, dependency, tool-surface, release, or runtime behavior changes. The artifact must be generated, not hand-edited.
