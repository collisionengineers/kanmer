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
- [x] Non-ticket/legacy layout is explicitly deferred: current runtime preserves canonical missing-document semantics; a fixture requires a future injectable legacy-layout harness.
- [x] Injected I/O failure fixture is explicitly deferred: all paths are validated before reads and the report records that no partial result is returned by the canonical whole-call error path.
- [x] Versions independently match returned bytes.
- [x] Ticket/model resolution occurs once.
- [x] Output order is retained through concurrent reads.
- [x] Raw protocol schema/result passes.
- [x] Tool count unchanged.
- [x] MCP-023 reuse contract is recorded: the shared core/MCP helper is exposed and linked; downstream MCP-023 owns the integration proof.

## Documentation and artifacts

- [x] Update canonical tool reference once.
- [x] Update source tool description/examples.
- [x] Update FRD-022 only if required (not required; existing contract is compatible).
- [x] Run targeted typecheck/build/smoke/protocol/discovery/core tests.
- [x] Build plugin from an isolated normal checkout.
- [x] Run plugin check.
- [x] Root verify was attempted and is unavailable on this base; the report records the missing script rather than claiming a pass.
- [x] Confirm old-client single calls still pass unchanged.
- [x] Run `git diff --check` and inspect status.
- [x] Record evidence in post-implementation report.
- [x] Stop before merge.

## Deferred (explicitly outside MCP-019)

- [x] MCP-023 consumption is an explicit downstream contract, linked in the ticket and plan; it will be verified when MCP-023 implements the execution packet.
- [x] Legacy-layout and injected-I/O fixtures are explicitly deferred to a future injectable core harness; current behavior and validation-before-read guarantees are recorded in the report.

## Closeout — MCP-019

- [x] PR merge verified ([#87](https://github.com/collisionengineers/kanmer/pull/87), merged 2026-08-20T23:01:50Z)
- [x] proof.md finalised (PR URL + merge commit `23c42e0` recorded)
- [x] Moved to final stage
- [x] Outcome recorded in ticket body (MCP-023 and fixture deferrals retained as follow-ups)
- [x] Removed recorded worktree `.worktrees/mcp-019`.
- [x] Deleted local/remote `mcp-019-batch-ticket-doc-reads` after confirming PR #87 merged; fetched/pruned worktrees.
- [x] Released with `take_ticket action: "release"`.

## Closeout result — MCP-019

- [x] PR merge verified ([#87](https://github.com/collisionengineers/kanmer/pull/87), merged 2026-08-20T23:01:50Z)
- [x] proof.md finalised (PR URL + merge commit `23c42e0` recorded)
- [x] Moved to final stage
- [x] Outcome recorded in ticket body; [[MCP-023]] and the two unimplemented test fixtures remain explicit deferrals
- [x] Removed recorded worktree `.worktrees/mcp-019`
- [x] Deleted local branch `mcp-019-batch-ticket-doc-reads`
- [x] Deleted the merged remote branch; fetched/pruned worktrees
- [x] Ticket release confirmed after recorded worktree/branch cleanup.

## Release confirmation — MCP-019

- [x] Ticket released after the recorded worktree and both branches were removed; no cleanup work remains.
