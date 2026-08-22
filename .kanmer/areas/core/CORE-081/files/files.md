# Files — CORE-081

## Modify

| Path | Responsibility |
|---|---|
| `packages/mcp-server/src/sources.ts` | Extend the existing source transport, response-body lifecycle, refresh-lock wait, encoding, aggregate-budget, link-cap, and linked-page `304` paths. |
| `packages/mcp-server/src/sources.test.ts` | Add deterministic regressions for every current-head review finding without weakening existing assertions. |
| `packages/mcp-server/src/sources-cache.test.ts` | Extend cache/validator coverage only if the existing source test split requires it. |
| `docs/functional/frd/FRD-027-project-declared-sources.md` | Clarify the normative transport, cache, encoding, crawl-cap, and conditional-response requirements where the implementation contract is currently underspecified. |
| `docs/architecture/adr/ADR-0020-project-declared-source-trust.md` | Record the lifecycle invariants and preserve the existing trust-boundary decision. |

## Verify / reuse

- `packages/mcp-server/src/sourceCache.ts`, `sourceFetch.ts`, and adjacent helpers (if present in the current head): reuse existing cache/HTTP seams; do not create a parallel transport stack.
- `packages/mcp-server/src/index.ts`: verify the production caller remains the registered project-declared-sources tool path.
- Existing CORE-026 tests and fixture utilities: keep all assertions and safety coverage.

## Do not modify

GitHub protection/Actions variables, GUI sync, unrelated MCP tools, board files, generated plugin artifacts, or any ticket documents outside the Kanmer MCP helpers.

## Scope boundary

This ticket resolves only the seven current-head review findings listed in CORE-081. New defects discovered outside those findings become linked follow-up tickets; they are not absorbed here.
