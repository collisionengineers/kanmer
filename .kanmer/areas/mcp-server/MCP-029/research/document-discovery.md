# Research — MCP-029: document discovery

## Question

Why can a ticket summary report research while `get_ticket_doc(id, "research")` reports it absent, and what MCP change makes the real document paths discoverable without breaking explicit reads?

## Findings

- Format 3 deliberately classifies documents by folder. `packages/core/src/docpaths.ts` lists every Markdown file recursively under a type folder; any one satisfies the type requirement.
- A bare document id is a compatibility shorthand. `docPathIn(..., "research")` maps only to `research/research.md`; `KanmerStore.getDocWithVersion` reads that single computed path and returns absence when it is not present.
- `KanmerStore.getTicketDocsInfo` derives summaries from recursive counts. The MCP `get_item` and `get_doc_gates` responses therefore truthfully report that research exists but omit the relative filenames.
- GUI-102 has exactly this valid layout: `research/portable-connect-integration.md` exists, but the bare index is absent. Its activity log records the named write.
- FRD-003 T6 requires bare reads to resolve the folder index **or listing**, while T7 requires per-type counts. Current core and MCP behavior implement the index/count halves but not the listing/discovery half.
- The existing MCP smoke proves a caller can read a known nested path, but it does not prove a caller can learn that path. MCP-019 adds batch reads for selected known documents; it does not supply a selection source.

## Implication

Keep explicit paths and bare-index reads compatible. Add a read-only, deterministic document inventory (ideally paths grouped by type in `get_item`/a dedicated response) so callers can request the actual file. Do not silently concatenate arbitrary documents for the bare form: that would lose path/version identity and make optimistic concurrency ambiguous.

## Sources

- `packages/core/src/docpaths.ts`: path resolution and recursive listing.
- `packages/core/src/store.ts`: `getDocWithVersion` and `getTicketDocsInfo`.
- `packages/mcp-server/src/index.ts`: MCP response shaping.
- `packages/mcp-server/src/smoke.mjs`: known nested-read coverage.
- `docs/functional/frd/FRD-003-ticket-documents.md` T6–T7.
- `GUI-102`: MCP reads and activity evidence from 2026-08-20.
