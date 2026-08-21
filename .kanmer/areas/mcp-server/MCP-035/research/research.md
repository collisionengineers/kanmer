# Research — MCP-035

## Question

Where does the legacy-layout document-read path bypass the document-ID safety contract, and what is the smallest compatible repair?

## Findings

1. **The bypass is in the shared core reader.** packages/core/src/store.ts:getDocsWithVersions resolves the item, then immediately returns { exists: false, content: null, version: null } records for every requested document when loc.kind !== "v2". The v2 branch calls docPathIn for every requested path before probing files, so malformed later entries reject the whole request. The format-1 branch never calls docPathIn.

2. **The MCP single and batch forms share this method.** packages/mcp-server/src/ticket-docs.ts:readTicketDocuments trims and de-duplicates the request, then delegates to store.getDocsWithVersions. get_ticket_doc uses that helper for both its legacy single response and its ordered batch response. A core fix therefore covers both MCP forms without a second API or MCP-specific validation copy.

3. **docPathIn is the existing validator and preserves storage semantics.** packages/core/src/docpaths.ts normalizes backslashes as separators, rejects empty segments, . / .., unsafe segments, and unknown top-level document folders, while retaining the documented bare-type mapping (for example plan → plan/plan.md). It does not read the filesystem when used for validation.

4. **Legacy reads intentionally preserve missing-document behavior.** Format-1 boards have no ticket folders or pipeline documents in the v3 sense, so safe requests currently return normal missing records. MCP-035 must keep that response exactly while rejecting malformed requests before any document result is produced.

5. **Existing tests cover v3 validation but not legacy validation.** packages/core/src/docs.test.ts proves ordered batch reads and rejects traversal on the current layout. packages/core/src/store.test.ts already seeds a realistic format-1 board (.kanmer/tickets, .kanmer/plans, .kanmer/research) and is the appropriate place for a legacy regression.

## Implication

Compute/validate every requested path before the format-specific return. For format 1, validate against a non-reading placeholder root and return the existing missing records; for v2/v3, reuse the computed paths for the existing reads. Add a format-1 test for a safe absent document and malformed traversal/absolute/backslash requests. Run the existing MCP smoke and protocol suites to prove both public forms remain green.
