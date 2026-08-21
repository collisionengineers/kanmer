# Plan — MCP-035: validate legacy document IDs

## Governing docs

- docs/functional/frd/FRD-022-mcp-server-surface.md: preserve the get_ticket_doc read contract and its full-surface smoke/protocol rail (R1, R3, R6). The change is internal validation only; the public single response, batch ordering, and missing-document semantics remain unchanged.
- MCP-019 scratch/independent-review: remediate the reproduced P2 where format-1 early return bypasses document-path validation.
- HZN-007 context: keep the remediation narrow, evidence-backed, and conflict-free; author must stop at Review and not self-review or merge.

## Approach

Validate all requested paths once with the existing docPathIn validator before branching on storage format. For v1, use a harmless placeholder root solely for validation, then return the established missing records. For v2/v3, retain the computed paths for the existing reads. Add regression coverage to the existing format-1 fixture for invalid traversal/absolute/backslash input and safe absent documents. This is preferable to adding MCP-side checks because the shared core method already serves both public forms and MCP-023 consumers.

## Ordered steps

1. Modify getDocsWithVersions to compute every validated path before the legacy return and reuse the v2 paths.
2. Extend the existing format-1 core fixture to assert malformed requests reject atomically and safe absent documents retain the missing response.
3. Run focused core tests, typechecks/build, MCP stdio smoke, protocol smoke, discovery smoke, and diff checks.
4. Record the implementation report, commit traceability, push the branch, open PR #<number>, and move MCP-035 to Review.

## Proof

The post-implementation report will record the exact commit/PR and command exit codes. Verification on merged main should rerun the focused core document tests, core and MCP typechecks, build, stdio smoke, protocol smoke, discovery smoke, and git diff check. The reviewer should inspect that only the narrow core/test files changed.

## Risks and mitigations

- A v1 validation call must not read or write a document path: use docPathIn only for parsing, then return the existing missing records.
- Reusing computed v2 paths must preserve request order, duplicate behavior at the core API boundary, versions, and missing entries; retain the existing Promise.all mapping.
- A malformed later batch entry must reject before any document read; the regression asserts rejection rather than a partial array.
- MCP-023 and unrelated tickets are out of scope; do not modify their source or board records.
