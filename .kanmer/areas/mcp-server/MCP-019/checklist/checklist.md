# Checklist — MCP-019

## Legacy contract

- [ ] Read current schema/handler/result/tests/reference.
- [ ] Capture exact single success response.
- [ ] Capture exact single absent response.
- [ ] Identify canonical path validation/read/version methods.
- [ ] Identify nested research/scratch support.

## Schema

- [ ] Keep required `id`.
- [ ] Support legacy optional-at-schema `doc` form.
- [ ] Add `docs` array with min 1/max 25.
- [ ] Enforce exactly one of `doc`/`docs`.
- [ ] Reject neither/both with actionable error.
- [ ] Reject empty ids.
- [ ] Confirm discovery schema advertises both forms.

## Shared helper

- [ ] Reuse or add one MCP document-read helper.
- [ ] Resolve item once.
- [ ] Refuse non-ticket/legacy layout canonically.
- [ ] Resolve document model once.
- [ ] Validate every id before reads.
- [ ] Reuse core path/traversal/version logic.
- [ ] De-duplicate preserving first order.
- [ ] Read bounded list and preserve output order.
- [ ] Treat absence normally.
- [ ] Fail whole call on I/O error.
- [ ] Expose helper for MCP-023.

## Results

- [ ] Single form returns exact existing top-level shape.
- [ ] Batch returns `{id, documents:[...]}`.
- [ ] Every batch entry includes `doc`, `exists`, `content`, `version`.
- [ ] No unrequested body/attachments/directories/gates are returned.
- [ ] Document non-atomic version semantics.

## Tests

- [ ] Legacy single present.
- [ ] Legacy single absent.
- [ ] Ordered multi present.
- [ ] Mixed present/absent.
- [ ] Nested research.
- [ ] Scratch.
- [ ] Duplicate ids.
- [ ] One-entry batch.
- [ ] 25-entry boundary.
- [ ] 26-entry rejection.
- [ ] Neither/both fields.
- [ ] Empty id.
- [ ] Unknown/unsafe/traversal ids.
- [ ] Non-ticket/legacy layout.
- [ ] Injected I/O failure gives no partial result.
- [ ] Versions independently match returned bytes.
- [ ] Ticket/model resolution occurs once.
- [ ] Output order stable under concurrent reads.
- [ ] Raw protocol schema/result passes.
- [ ] Tool count unchanged.
- [ ] MCP-023 uses shared helper.

## Documentation and artifacts

- [ ] Update canonical tool reference once.
- [ ] Update source tool description/examples.
- [ ] Update FRD-022 only if required.
- [ ] Run typecheck/build/smoke/protocol/discovery/tests.
- [ ] Build plugin from normal main checkout.
- [ ] Run plugin check.
- [ ] Run root verify.
- [ ] Confirm old-client single calls still pass unchanged.
- [ ] Run `git diff --check` and inspect status.
- [ ] Record evidence in post-implementation report.
- [ ] Stop before merge.
