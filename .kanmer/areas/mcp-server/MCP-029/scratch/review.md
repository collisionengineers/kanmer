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

# Independent re-review — MCP-029 / PR #65 after `56e5682`

I am not the author. This review does not merge or move the ticket.

## Changes reviewed

- Commit `56e5682ab897e5e319f2f8c2ff60ab920c38426a` resolves the prior blocking review comment by replacing separate `docCounts` and path-list traversals with `documentInventory` in `packages/core/src/docpaths.ts`.
- `getTicketDocsInfo` now derives `docs`, per-type `counts`, and sorted readable `documentPaths` from that one inventory result.
- The public MCP responses remain additive: summaries and `get_item` expose `documentPaths`; `get_doc_gates` exposes paths and counts. Explicit path reads and a bare type’s conventional-index semantics are unchanged.
- The remediation also adds the requested smoke assertion that a bare `research` read remains absent when only `research/deep/topic.md` exists, and tool prose explicitly distinguishes readable Markdown in gate-exempt folders from gate-satisfying evidence.

## Review against ticket, report, and governing document

- The diff fulfills the ticket’s four outcomes: named folder documents become discoverable; callers can distinguish a non-empty type folder from a missing index; the returned path can be read; and bare/index compatibility remains pinned.
- The post-implementation report now accurately lists every changed source, test, tool-reference, and generated bundle file. Its remediation note matches the new diff.
- The plan’s FRD-003 T6/T7 commitments hold: discovery is a deterministic type-relative listing, while per-type counts continue to use the same recursive folder model. No governing document was modified, and no unplanned surface was introduced.
- `open-questions/document-discovery.md` has no active unanswered item. Its remaining checkbox is below `## Parked`, so it does not block the ticket.
- The ticket folder was independently inventoried with `rg --files`; every discovered ticket document was read through MCP by its exact path, including this prior review scratch document.

## Evidence independently run

- `npm test -w @kanmer/core` — 249 tests passed.
- `npm run build` — core and MCP ESM/standalone builds passed.
- `npm run typecheck -w @kanmer/core` and `npm run typecheck -w @kanmer/mcp-server` — passed.
- `node packages/mcp-server/src/smoke.mjs` — 159/159 checks passed, including discovery from `get_item` and `get_doc_gates`, nested read, and bare-index absence.
- `npm run smoke:protocol` — 26/26 checks passed.
- `git diff --check origin/main...HEAD` — passed.
- Fresh standalone bundle versus committed `plugins/kanmer/mcp/kanmer-mcp.cjs` — byte-identical via `git diff --no-index --exit-code`.
- The formal `npm run plugin:check` remains intentionally unavailable in a linked worktree; the direct fresh-bundle comparison supplies the relevant byte check here.

## Comments and disposition

1. **Prior blocking comment — fixed in PR.** Counts and paths now derive from one inventory traversal per typed folder in the same `getTicketDocsInfo` response. This removes the redundant walk and the counts/paths mixed-snapshot risk.
2. **Prior non-blocking bare-index assertion — fixed in PR.** MCP smoke now asserts that a bare type read is absent without its index even when discovery lists a named child.
3. **Prior non-blocking exempt-folder clarification — fixed in PR.** Tool reference states that `documentPaths` can include Markdown in exempt folders, and that readable does not mean gate-satisfying.
4. **No new blocking or non-blocking finding.** The inventory’s sorted type-relative Markdown paths are valid `get_ticket_doc` inputs; it does not return content or weaken gate semantics.

## Verdict

**PASS — ready to merge.** No blockers remain. Per instruction, I did not merge the PR and did not move MCP-029; it remains in Review awaiting the owning reviewer/next step.
