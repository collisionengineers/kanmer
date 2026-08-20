# Open questions — MCP-019

## Resolved decisions

- **New tool or extended tool?** Extend `get_ticket_doc`; do not create `get_ticket_docs`.
- **How is backward compatibility preserved?** Existing `{id, doc}` input and its response shape remain unchanged.
- **Batch input field?** `{id, docs:[...]}` with exactly one of `doc`/`docs`.
- **Maximum batch size?** 25 requested ids.
- **How are duplicates handled?** Validate, then de-duplicate while preserving first-request order.
- **What happens for a missing known document?** Return an ordinary `exists:false` entry with null content/version per the existing single API.
- **What happens for unknown/unsafe ids?** Reject the whole request before any file read.
- **Are partial results returned after an I/O error?** No. Use the canonical whole-call error; absence is the only normal missing state.
- **Is the batch atomic?** No. Each returned version binds to that document's exact bytes; versions are the concurrency contract.
- **May reads run concurrently?** Yes after all validation, with bounded count and output reordered to normalized request order.
- **How many times is the ticket resolved?** Once per call.
- **How does MCP-023 use this?** Through the same internal multi-read helper, never a parallel document implementation.
- **Does tool count change?** No.
- **Is a plugin rebuild required?** Yes, because the shipped input schema/description changes; rebuild from normal main checkout.

No unresolved implementation questions remain.
