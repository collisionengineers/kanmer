# Plan — MCP-029: discoverable folder-document paths

## Objective

Make it possible for an MCP client to discover the exact Markdown paths present under a ticket’s typed document folders. Preserve all existing explicit-path and bare-index `get_ticket_doc` behavior, including content/version semantics.

## Governing docs

- **FRD-003 T6:** Complete its “folder index or listing” requirement by exposing a deterministic listing path through the public read surface.
- **FRD-003 T7:** Retain existing per-type counts and use the same recursive Markdown inventory; do not invent a second filesystem traversal with different inclusion rules.

## Chosen approach

Extend the existing `TicketDocsInfo` metadata from the core store with a typed, relative-path inventory. Populate it from the same recursive listing used for counts, then surface it through `get_item` and `get_doc_gates`, which already carry document metadata. Keep `get_ticket_doc(id, "research")` as an index-file read, because making it return an arbitrary or concatenated file would silently break content/version expectations.

A separate listing tool is rejected: it duplicates ticket lookup and increases tool surface when existing read responses already communicate document presence. Changing bare reads is rejected for compatibility and ambiguity.

## Ordered implementation

1. Add a core helper that returns sorted Markdown paths under every typed document folder, excluding non-Markdown files while preserving valid nested paths.
2. Extend the ticket document-info type and `getTicketDocsInfo` to return inventory and counts from one canonical model.
3. Include the inventory in the MCP `get_item` and `get_doc_gates` results, and update their descriptions/tool reference to make discovery explicit.
4. Add core tests for a named-only nested research file, stable relative paths, and exclusions.
5. Add MCP smoke/protocol coverage: discover `research/portable-connect-integration.md`-shaped evidence from metadata, then read it by the reported path; retain bare-index absence behavior.
6. Build/typecheck/test the affected packages, regenerate the plugin bundle, and run plugin consistency checks.
7. Record implementation/report evidence, obtain review, verify on merged main, and write proof.

## Risks and mitigations

- **Breaking client expectations:** add fields only; leave existing scalar response fields intact and cover legacy bare reads.
- **Unsafe or inconsistent paths:** derive inventory from existing validated type folders and reuse current recursive listing semantics.
- **Response bloat:** return path metadata only, never unrequested file bytes; ticket folders are intentionally bounded by the board’s document model.
- **Overlap with MCP-019:** document the division: discovery supplies paths; batch reads consume selected paths.

## Proof

Core and protocol tests will demonstrate a ticket whose only research is named/nested, an MCP metadata response containing the exact path, a successful read using that path, and unchanged behavior for a missing index file.
