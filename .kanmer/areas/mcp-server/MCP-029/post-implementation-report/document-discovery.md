# Post-implementation report — MCP-029

## Summary

Added read-only `documentPaths` metadata to ticket summaries, `get_item`, and `get_doc_gates`. Each path is a sorted type-relative Markdown path that can be supplied directly to `get_ticket_doc`. This makes named folder documents discoverable while preserving bare type reads as conventional index-file reads.

## Changes

- `packages/core/src/docpaths.ts`: added the canonical recursive Markdown inventory.
- `packages/core/src/store.ts` and `types.ts`: added `TicketDocsInfo.documentPaths`.
- `packages/mcp-server/src/index.ts`: returned the inventory from summaries, `get_item`, and `get_doc_gates`; clarified `get_item` description.
- `packages/core/src/docs.test.ts`: covered sorted nested path inventory.
- `packages/mcp-server/src/smoke.mjs`: verified metadata discovers a nested research document before reading it.
- Canonical tool reference and shipped plugin bundle: documented and regenerated the new field.

## Governing-doc compliance

FRD-003 T6 now has a concrete MCP discovery path for named documents beneath a typed folder. FRD-003 T7’s recursive counts remain unchanged and the inventory reuses the same folder semantics.

## Verification

- `npm test -w @kanmer/core` — 249 tests passed.
- `npm run typecheck -w @kanmer/core` — passed.
- `npm run typecheck -w @kanmer/mcp-server` — passed.
- `node packages/mcp-server/src/smoke.mjs` — 158 checks passed.
- `npm run smoke:protocol` — 26 checks passed.
- `npm run plugin:build` — passed; bundle regenerated.
- `git diff --check` — passed.
- `npm run plugin:check` — intentionally refused because this is a linked worktree; repository policy requires running it from the main checkout.

## Traceability

- Commit: `686f85b0cbf61f10d97ee27a68a43eb7da770321`

## Review focus

Confirm that the additive `documentPaths` wire field has the intended compatibility profile and that exposing readable Markdown paths for gate-exempt folders does not violate attachment/reference expectations.

## Verify on merged main

Run the same core tests, typechecks, MCP smoke and protocol smoke from merged main, then run `npm run plugin:check` from the main checkout. Exercise a ticket with only `research/named.md`: metadata must name it, `get_ticket_doc(..., "research/named.md")` must succeed, and bare `research` must remain absent without an index.
