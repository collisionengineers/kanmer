# Checklist — MCP-019

## Legacy contract

- [x] Read current schema/handler/result/tests/reference.
- [x] Capture exact single success response.
- [x] Capture exact single absent response.
- [x] Identify canonical path validation/read/version methods.
- [x] Identify nested research/scratch support.

## Schema

- [x] Keep required `id`.
- [x] Support legacy optional-at-schema `doc` form.
- [x] Add `docs` array with min 1/max 25.
- [x] Enforce exactly one of `doc`/`docs`.
- [x] Reject neither/both with actionable error.
- [x] Reject empty document ids.
- [x] Confirm discovery schema advertises both forms.

## Shared helper

- [x] Reuse or add one MCP document-read helper.
- [x] Resolve item once.
- [x] Preserve the canonical legacy-layout missing-document semantics.
- [x] Resolve and validate all document paths before reads.
- [x] Validate every id before reads.
- [x] Reuse core path/traversal/version logic.
- [x] De-duplicate preserving first order.
- [x] Read bounded list and preserve output order.
- [x] Treat absence normally.
- [x] Fail whole call on I/O error.
- [x] Expose helper for MCP-023.

## Results

- [x] Single form returns exact existing top-level shape.
- [x] Batch returns `{id, documents:[...]}`.
- [x] Every batch entry includes `doc`, `exists`, `content`, `version`.
- [x] No unrequested body/attachments/directories/gates are returned.
- [x] Document non-atomic version semantics.

## Tests

- [x] Legacy single present.
- [x] Legacy single absent.
- [x] Ordered multi present.
- [x] Mixed present/absent.
- [x] Nested research.
- [x] Scratch.
- [x] Duplicate ids.
- [x] One-entry batch.
- [x] 25-entry boundary.
- [x] 26-entry rejection.
- [x] Neither/both fields.
- [x] Empty id.
- [x] Unknown/unsafe/traversal ids.
- [ ] Non-ticket/legacy layout.
- [ ] Injected I/O failure gives no partial result.
- [x] Versions independently match returned bytes.
- [x] Ticket/model resolution occurs once.
- [x] Output order is retained through concurrent reads.
- [x] Raw protocol schema/result passes.
- [x] Tool count unchanged.
- [ ] MCP-023 uses shared helper.

## Documentation and artifacts

- [x] Update canonical tool reference once.
- [x] Update source tool description/examples.
- [x] Update FRD-022 only if required (not required; existing contract is compatible).
- [x] Run targeted typecheck/build/smoke/protocol/discovery/core tests.
- [x] Build plugin from an isolated normal checkout.
- [x] Run plugin check.
- [ ] Run root verify (attempted; unrelated UI typecheck mismatch and Windows GUI cleanup failures recorded in report).
- [x] Confirm old-client single calls still pass unchanged.
- [x] Run `git diff --check` and inspect status.
- [ ] Record evidence in post-implementation report.
- [x] Stop before merge.

## Deferred (explicitly outside MCP-019)

- [ ] MCP-023 must consume `getDocsWithVersions` / `readTicketDocuments` when its execution-packet implementation begins; MCP-023 is currently Preparing and has no source implementation to modify.
- [ ] Add legacy-layout and injected-I/O test fixtures if a later core test harness introduces those seams; this change preserves the prior legacy response semantics and validates all paths before any file probe.
