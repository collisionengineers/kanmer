# CORE-088 post-implementation report

## Scope and lineage

Implemented only the four mapped CORE-026 review findings F-006 through F-009. The packet named cumulative base `453a92091d7a422a237996f024ab6940ea6fccfb`; before the isolated worktree was created, the reachable parent advanced through CORE-089 to `f2e694a4f9ce689c0949814ea88c2910ddb93f37`. Worktree `.worktrees/core-088`, branch `core-088-source-cache-atomicity`, was created from that reachable parent and the deviation is recorded in execute scratch.

## Implementation

- F-006: source-cache ancestors and cache directory are lstat-checked before lock/read/mkdir/write; symlinked cache files are rejected; raw cache bytes, document count, aggregate document bytes, canonical HTTPS URLs, required root document, and same-origin document URLs are validated before reuse. Stale-root fallback retains prior cached failures; root 304 persists replacement validators; a forced caller retries once an active refresh rejects.
- F-008: pinned HTTPS lookup now supplies the preflight-approved address for both Node scalar and `all:true` callback shapes, with the address family pinned.
- F-007: stale empty/partial owner markers become reclaimable after the bounded stale interval; future persisted timestamps fall back to filesystem age; callback and release failures are surfaced together as `AggregateError`.
- F-009: orphan cleanup uses the shared exclusive lock, preserves Git's dirty-source refusal before quarantine, atomically quarantines the source tree, fingerprints the quarantined snapshot, removes only a matching snapshot, and restores it on mismatch/failure. New orphan markers record the bytes actually copied into the board worktree.

## Deterministic evidence

- `node --test src/sources.test.mjs` from `packages/mcp-server`: 32/32 passed, exit 0.
- `npm test -w @kanmer/core -- src/io.test.ts`: 32/32 passed, exit 0.
- `npm test -w @kanmer/gui -- src/main/kanmerGit.test.ts`: 31/31 passed, exit 0, 101.97s. This includes the inherited dirty-source retry/mismatch regression and the new concurrent orphan cleanup/quarantine regression.
- `npm run typecheck`: all four workspaces passed, exit 0.
- `npm run verify:docs`: PASS, exit 0; manual current (22 chapters).
- `npm run plugin:build`: PASS; regenerated `plugins/kanmer/mcp/kanmer-mcp.cjs`.
- `git diff --check`: PASS.
- First GUI run after the initial quarantine implementation was 30/31: the inherited `preserves source after an orphan cleanup retry sees a changed version` assertion exposed that quarantine bypassed Git's dirty-worktree refusal. The pre-quarantine dirty check was added; the corrected full rail is the 31/31 PASS recorded above.
- `npm run plugin:check`: exit 1 / INCONCLUSIVE in the linked worktree; it refused because `@kanmer/core` resolved to the main checkout rather than this worktree.
- `npm run mcpb:check`: exit 1 / INCONCLUSIVE; the checkout lacks `node_modules/@anthropic-ai/mcpb/dist/cli/cli.js` and the command failed with `MODULE_NOT_FOUND`.
- No live/external DNS or cloud proof was claimed.

## Handoff state

The merged-main proof item remains unchecked. This report is implementation evidence for independent review; the PR is to remain open and the ticket should stop at Review.

## Commit and PR handoff

- Implementation commit: `8d62176216d8c886779217fd846149f0b04b1655`.
- Branch: `core-088-source-cache-atomicity`; target branch: `core-026-project-declared-sources`.
- The generated plugin artifact is included in the commit. The PR remains open for independent review; no merge, verification, or cleanup was performed.
