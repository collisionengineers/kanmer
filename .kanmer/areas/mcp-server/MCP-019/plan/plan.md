# Plan — MCP-019: batch reads for `get_ticket_doc`

## Objective

Allow one `get_ticket_doc` invocation to return an ordered set of requested ticket documents while preserving the existing single-document request/response exactly, reusing core path/version semantics, and exposing one shared helper for MCP-023.

## Starting state

- `get_ticket_doc` accepts required `id` and `doc`.
- Every call resolves the ticket and reads one document.
- Missing documents return the established null/existence result.
- Document versions support optimistic concurrency.
- MCP-023 needs several index documents in one execution packet.

## Required changes

### 1. Capture the legacy contract

1. Read the current tool schema, handler, result builder, tool reference, and smoke/protocol assertions.
2. Add/confirm a regression fixture that snapshots/asserts the exact legacy single response fields and null behavior.
3. Identify the canonical store method(s) that validate ids, resolve paths, read bytes, and calculate versions.
4. Identify existing support for nested `research/...`, proof, and scratch document ids.
5. Do not change the legacy path while adding batch support.

### 2. Define schema with an XOR rule

6. Keep `id` required.
7. Change `doc` from required to optional only at schema/type level while preserving its runtime path.
8. Add optional `docs` as an array of strings with minimum 1 and maximum 25.
9. Add schema-level/refinement validation requiring exactly one of `doc` or `docs`.
10. Reject both fields and neither field with one actionable validation message.
11. Reject empty/whitespace-only ids.
12. Ensure MCP schema discovery accurately advertises both forms and the cap.
13. Do not accept a scalar in `docs` or array in `doc`.

### 3. Add one shared read helper

14. Locate the existing document-read helper; extend it if suitable.
15. Otherwise create one focused `ticket-docs` helper in the MCP server package.
16. Accept store/root context, ticket id, and normalized requested ids.
17. Resolve the item once.
18. Refuse non-ticket/unsupported legacy layouts with the existing canonical error.
19. Resolve configured document model/folder context once.
20. Validate **all** requested ids through existing safe resolver before reading any content.
21. Do not duplicate traversal or scratch/research parsing logic.
22. De-duplicate validated ids preserving first occurrence order.
23. Read each unique document through the existing store method.
24. Allow bounded `Promise.all` or sequential reads; preserve output order regardless.
25. Return the same semantic record used by single form for each document.
26. Propagate canonical errors for I/O failures.
27. Treat known absence as a normal result.
28. Expose the helper for MCP-023 without coupling it to MCP tool result formatting.

### 4. Preserve single form

29. Branch on the normalized input form after schema validation.
30. For `doc`, invoke the same helper with one id or the unchanged existing read path.
31. Return the exact current top-level single result—not a one-element `documents` wrapper.
32. Preserve exact absent values and `version` behavior.
33. Preserve existing text/error messages unless MCP-022's canonical coded builder applies them uniformly.

### 5. Implement batch form

34. Normalize the request array (trim/reject according to existing id rules).
35. Validate all entries before file access.
36. De-duplicate preserving first occurrence.
37. Call the shared helper once with the normalized list.
38. Return `{id, documents:[...]}` with entries in normalized order.
39. For each entry include exact fields `doc`, `exists`, `content`, and `version` using existing semantics.
40. Do not include unrequested ticket body, attachments, directory listings, or gate reports.
41. Do not claim snapshot atomicity.
42. Ensure response serialization handles Markdown/unicode/empty bytes exactly as single form.

### 6. Tests and instrumentation

43. Test exact legacy single success.
44. Test exact legacy single absence.
45. Test ordered three-document success.
46. Test known absent entry mixed with present entries.
47. Test nested research id.
48. Test canonical scratch id/path.
49. Test duplicate ids and first-order preservation.
50. Test one-entry `docs` array.
51. Test 25-entry boundary using valid distinct fixture docs.
52. Test 26-entry rejection.
53. Test neither field.
54. Test both fields.
55. Test empty/whitespace id.
56. Test unknown configured id according to existing rules.
57. Test absolute/traversal/backslash unsafe inputs.
58. Test non-ticket and legacy layout.
59. Test an injected I/O failure returns no partial success.
60. Independently hash returned bytes and compare each version.
61. Use a fake/spy store or helper counter to assert ticket/model resolution once per batch.
62. Assert output order after concurrent reads.
63. Assert tool count unchanged.
64. Assert raw JSON-RPC schema/result in protocol smoke.
65. Add an integration assertion that MCP-023 uses this helper when both changes coexist; adapt whichever ticket lands second.

### 7. Documentation and shipped artifacts

66. Update the canonical tool-reference `get_ticket_doc` entry and field semantics.
67. Document XOR input, cap, dedupe/order, missing state, whole-call errors, and per-document versions/non-atomicity.
68. Update FRD-022 only if the governing delta does not already specify the batch behavior.
69. Update tool description in source with concise examples.
70. Run typecheck/build/smokes/discovery.
71. From the normal main checkout, run canonical plugin build and check; commit generated bundle bytes.
72. Confirm old clients calling `doc` require no changes.

## Expected files

- `packages/mcp-server/src/index.ts`
- existing/new shared `ticket-docs` helper and tests
- `packages/mcp-server/src/smoke.mjs`
- `packages/mcp-server/src/smoke-protocol.mjs`
- canonical tool reference
- generated plugin bundle
- FRD-022 only if required

## Acceptance checks

- Existing single form and response are unchanged.
- Exactly one of `doc` or `docs` is required.
- Batch is bounded to 25 and deterministic.
- Every id is validated before reads.
- Ticket/document context resolves once.
- Known absence is represented per document; unsafe ids/I/O errors fail whole call.
- Per-document versions match exact returned bytes.
- Batch is documented as non-atomic.
- MCP-023 reuses the helper.
- Tool count is unchanged.
- Reference/schema/plugin bytes are synchronized.

## Verification commands

Run canonical equivalents of:

```bash
npm run typecheck
npm run build
node packages/mcp-server/src/smoke.mjs
npm run smoke:protocol
npm run smoke:discovery
npm test
```

From the normal main checkout:

```bash
npm run build
npm run plugin:build
npm run plugin:check
npm run verify
git diff --check
git status --short
```

## Failure and deviation rules

- Stop if preserving legacy response would require a breaking wrapper; retain two result forms under the one tool.
- Stop if a proposed helper bypasses core path/version validation.
- Do not add a second tool, write batching, recursive reads, attachments, locks, or partial I/O successes.
- Do not hand-edit plugin bytes.
- Do not merge or begin dependent implementation.

## Stop condition

Stop when one backward-compatible `get_ticket_doc` tool reads 1–25 requested documents with deterministic ordered results and per-file versions, resolves/validates ticket context once, passes protocol/smoke/legacy regression tests, is reused by the execution-packet implementation, and has synchronized tool reference/plugin bytes ready for independent review.
