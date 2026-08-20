# Independent review — MCP-029 / PR #65

## Changes reviewed

- PR #65 adds `TicketDocsInfo.documentPaths`, implemented by `listDocumentPaths` in `packages/core/src/docpaths.ts`.
- It surfaces the additive field from `list_items`, `get_item`, and `get_doc_gates`; the latter two satisfy the ticket's discovery route, and explicit/bare `get_ticket_doc` semantics are unchanged.
- The diff adds core coverage for sorted nested Markdown paths and MCP smoke coverage that discovers `research/deep/topic.md` before reading it.
- The tool reference and committed plugin bundle were updated. The ticket's only governing reference, FRD-003 T6–T7, supports a typed folder listing and keeps bare index reads compatible.

## Evidence checked

- Ticket folder inventory via `rg --files`: ticket body plus all six pipeline documents were present at their named paths; every one was read through MCP.
- `open-questions/document-discovery.md` has no active unticked question (the remaining item is correctly below the Parked heading).
- Ticket gates show its Review entry requirements satisfied; only post-merge proof is outstanding.
- PR metadata: open, mergeable, one commit (`686f85b`), no GitHub checks reported, no existing review decision.
- Independently ran in the PR worktree:
  - `npm test -w @kanmer/core` — 249 passed.
  - `node packages/mcp-server/src/smoke.mjs` — 158/158 passed.
  - `npm run smoke:protocol` — 26/26 passed.
- `git diff --check main...686f85b` passed.

## Comments

1. **BLOCKING — inventory and counts are not derived from one canonical traversal.**
   - The approved plan says `getTicketDocsInfo` should return inventory and counts “from one canonical model.” The implementation first calls `docCounts(loc.dir)`, which recursively reads every legal top-level folder, then calls `listDocumentPaths(loc.dir)`, which recursively reads every folder again.
   - This doubles the directory walks for every ticket summary and permits a concurrent document write to produce mismatched `docs`/counts versus `documentPaths` in a single response—the exact metadata a caller needs to disambiguate absence.
   - **Disposition:** needs change in this PR. Build a single typed inventory/count result from one recursive pass (or make `docCounts` return/reuse the per-type file lists) and derive booleans, counts, and readable paths from it.

2. **Non-blocking — add an explicit bare-index regression assertion.**
   - The new smoke proves discovery and nested-path reading, but does not assert that `get_ticket_doc(..., "research")` remains absent when only a named research file exists. The implementation retains that path code, so this is not a release blocker; adding it would directly pin the ticket's compatibility requirement.

3. **Non-blocking — clarify exempt-folder intent in tests/tool prose.**
   - `documentPaths` includes Markdown beneath `reference/`, `scratch/`, and `assets/` because all are readable ticket folders. This is technically consistent with `get_ticket_doc`, but the “read every path” wording can make scratch review notes look like gated pipeline evidence. State the intentional inclusion/exemption distinction in one focused test or prose sentence.

## Verdict

**Needs changes.** Do not merge/move. The feature design is correct and independently tested, but comment 1 must be resolved before approval; the claimed single canonical metadata model is not implemented.
