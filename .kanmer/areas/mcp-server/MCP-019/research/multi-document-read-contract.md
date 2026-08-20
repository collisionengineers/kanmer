# Research — MCP-019 multi-document ticket reads

## Goal

Agents currently need one `get_ticket_doc` round trip per document. Planning/execution commonly needs `files`, `plan`, `checklist`, `open-questions`, and selected research/scratch files together. A batch form reduces latency and failure points, but it must remain one document API and preserve the exact single-document contract for existing clients.

## Backward-compatible input

Keep the existing call valid:

```json
{ "id": "MCP-019", "doc": "plan" }
```

Add a batch form:

```json
{ "id": "MCP-019", "docs": ["files", "plan", "checklist"] }
```

Require exactly one of `doc` or `docs`. Reject neither/both before accessing storage. `docs` must be non-empty, bounded (recommended maximum 25), and contain non-empty document ids. De-duplicate while preserving first-request order.

Do not add `get_ticket_docs` as a second tool. MCP-023 must call the same internal batch helper rather than reimplement document loading.

## Response compatibility

For the single `doc` form, return the current response byte/field shape unchanged.

For `docs`, return an ordered collection, not an object whose key order/duplicate behavior is ambiguous:

```json
{
  "id": "MCP-019",
  "documents": [
    {"doc":"files","exists":true,"content":"...","version":"..."},
    {"doc":"plan","exists":false,"content":null,"version":null}
  ]
}
```

Each entry uses the same semantic fields as the current single response. Missing known documents are data, not transport failures: `exists:false`, `content:null`, and the canonical absent version value. Invalid/unsafe document ids should fail the whole request before any reads so a typo is not mistaken for a missing document.

## Document-id resolution

Use the store's existing resolver/validation for configured pipeline ids, nested research documents, proof/scratch documents, and safe relative paths. Do not create a second path sanitizer. Preserve the actual format-3 folder layout. Reject traversal, absolute paths, backslashes where disallowed, malformed scratch ids, and requests outside the ticket folder.

Resolve the ticket once. Confirm it is a ticket and its folder/layout is supported once, then read requested docs through one shared helper. Do not repeatedly call high-level `getItem`/doc-gate resolution for each id when the same ticket metadata can be reused.

## Concurrency and consistency

Local reads may run concurrently after full request validation, but output order must match normalized request order. Each document's `version` is calculated from the exact bytes returned. The batch is not an atomic filesystem snapshot; document versions are the concurrency contract. State this explicitly. Consumers that later write must pass the relevant per-document version.

A file that changes between reads can yield different versions; do not add locks or a board-wide transaction. If an individual read fails after validation (I/O error), fail the call with the canonical error rather than return a deceptively partial packet, unless the existing API already has a typed partial-error model. Absence is not an I/O error.

## Performance

The optimization is fewer MCP round trips and repeated ticket resolution, not unbounded parallel disk reads. Cap the batch, avoid reading directory trees or attachments implicitly, and return only requested content. Large research sets remain explicit requests.

Measure with protocol smoke/request-count assertions rather than fragile wall-clock thresholds. The acceptance target is one tool invocation and one ticket resolution for N documents.

## Tool and bundle implications

The tool count stays unchanged, but the input schema/description and output documentation change. Update the canonical tool reference. Rebuild the committed plugin bundle from the normal main checkout and run plugin synchronization checks. Old servers/clients remain interoperable because `doc` is preserved.

## Tests

Cover:

- legacy single call exact shape;
- ordered multi success;
- missing known doc;
- nested research and scratch ids;
- duplicate ids;
- maximum boundary and over-limit;
- neither/both fields;
- unknown/unsafe/traversal ids;
- non-ticket/legacy-layout behavior;
- per-document version correctness;
- a spy/counter proving ticket resolution occurs once;
- raw MCP protocol serialization;
- MCP-023 consuming the shared helper when both land.

## Non-goals

- No write batching.
- No attachment download or recursive folder read.
- No new MCP tool.
- No atomic snapshot/locking feature.
- No tool-count change.
- No parallel document API inside MCP-023.
