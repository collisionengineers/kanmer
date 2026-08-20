# Plan — MCP-023: `get_execution_packet` weak-agent entry point

## Objective

Provide one read-only call that either returns the complete bounded implementation brief for the current ticket or a deterministic refusal explaining exactly why dispatch is unsafe.

## Starting state

- Weak agents currently assemble ticket, groups, several documents, gates, and status through separate calls.
- MCP-022 supplies project identity and the `GATE_BLOCKED` vocabulary.
- Core can read individual docs and gate reports but cannot enumerate/batch all type-relative docs through one reusable API.
- MCP-019 will add multi-doc retrieval and must share that implementation.

## Governing constraints

- EPIC-009: one bounded packet; no take/worktree/write behaviour.
- MASTERPLAN S-06 / Appendix A: exact fields, refusal order, spike dominance, chore-with-plan acceptance, fallback text, and shared document API.
- DOC-011 will link FRD-010/022 deltas; keep `docs_todo` until then.

## Required changes

### A. Shared document read API

1. Add public result types for a ticket doc descriptor: type-relative `path`, `exists`, `content`, `version` as appropriate.
2. Add `KanmerStore.listTicketDocsWithVersions(id)` (or equivalent single clear name):
   - return `null` for legacy/non-ticket-folder layout;
   - recursively enumerate Markdown files beneath all ticket document folders;
   - return type-relative POSIX paths such as `plan/plan.md` and `research/auth.md`;
   - sort lexically;
   - compute each version from exact bytes using existing `contentVersion`;
   - do not include reference/assets binaries.
3. Add `KanmerStore.getDocsWithVersions(id, docs)`:
   - accept type-relative/bare paths;
   - preserve request order;
   - return one independent `{doc, exists, content, version}` per request;
   - a missing doc does not fail the other reads;
   - validate paths through `docPathIn`;
   - perform no writes.
4. Tests: index normalization, nested docs, missing docs, exact versions, order, legacy null, malformed path rejection, and byte-for-byte no-write behaviour.
5. If MCP-019 has already landed, use/adjust its exact helper rather than adding these methods again. If not, document in code that MCP-019 must route through them.

### B. Packet builder

6. Add `packages/mcp-server/src/execution-packet.ts` with explicit response types.
7. Add an ATX section extractor:
   - normalize line endings;
   - match headings `#{1,6}` with exact case-insensitive requested title and optional closing hashes;
   - capture until next heading at equal or higher level;
   - retain nested lower-level headings;
   - trim result;
   - return null when missing/empty.
8. Add unit-like smoke cases for `## Stop condition`, mixed case, closing hashes, nested subsection, equal/higher stop, setext non-match, and empty section.
9. Build a packet function accepting `{store, id, actor, project}`.
10. Read the item. If missing, non-ticket, or no format-3 folder/gate report, return first refusal:

    ```json
    {"ready":false,"code":"GATE_BLOCKED","reason":"…","missing":[],"project":…}
    ```

    Distinguish missing/non-ticket/legacy in reason while preserving the same precedence/code.
11. Read the full `GateReport`; use `report.profile`, not raw/default assumptions.
12. If resolved profile is `spike`, return spike refusal immediately, before computing missing gates.
13. Find the `leave-preparing` boundary. Build `missing` from unsatisfied requirements excluding `questions-resolved`.
14. If `missing` is non-empty, return refusal with those exact raw requirement names, the full gates, project, and compact ticket metadata.
15. Determine unresolved questions from the `questions-resolved` requirement/status in the report (or the same core counter if absent at that boundary). If unresolved, return question refusal with `missing:["questions-resolved"]` and gates.
16. Determine occupancy:
    - not taken → continue;
    - taken and non-empty assignee exactly equals current actor → continue;
    - taken with different or blank/unknown assignee → refuse with `missing:[]`, reason naming owner/branch/worktree where present.
17. Do not treat dependency `blocked` as packet refusal in this ticket; the fixed contract names gates/questions/occupancy only. Dependency physics is handled by later gate integration/reviewer.
18. For a ready ticket, assemble ticket object with exactly id, title, status, resolved profile, area, groups, refs, body, and `taken` object/null containing taken_at, assignee, branch, worktree.
19. Load every membership using `groupsForItem`; for each return id, kind, title, body/goal if useful, and full nullable `context.md`. Preserve ticket group order; missing group records/context do not throw—return an explicit null/warning field.
20. Batch-read bare `plan`, `checklist`, and `files`; return all three fixed keys with `exists/content/version`.
21. Enumerate every Markdown doc descriptor and exclude the three index paths (`plan/plan.md`, `checklist/checklist.md`, `files/files.md`) from `extraDocs`. Return path and version only; include open questions, research, scratch, proof, etc.
22. Set `stopCondition` from plan ATX `Stop condition`; if absent/empty use exactly:

    `Stop at the checklist; do not merge; do not start another ticket.`
23. Set `commandsHint` from first non-empty ATX section named `Commands`, `Verification commands`, or `Verification` in that precedence. If absent use exactly:

    `Use only the commands named in the plan/checklist, record exact exit codes, and stop on a failure.`
24. Return `ready:true`, project, ticket, groupContexts, documents, extraDocs, full gates, stopCondition, commandsHint. Do not include server-internal paths beyond project identity.

### C. Tool registration

25. Register `get_execution_packet` in `index.ts` among read tools with input `{id}`.
26. Mark `readOnlyHint:true`, `openWorldHint:false`; wrap in `guard`, never `write`.
27. Obtain actor with existing `actorName(extra)` by accepting the handler’s second MCP argument; do not duplicate client identity logic.
28. Obtain project identity from MCP-022’s helper/current status inputs; do not hash a second way.
29. Update explicit tool-count references to +1 only where present.

### D. Verification matrix

30. Create a ready feature fixture with required research/files/plan/checklist and resolved questions; assert complete ready shape, full GateReport, group context, correct versions, extra listings, parsed stop/commands.
31. Create a chore with only plan and resolved/no questions; assert `ready:true`, and files/checklist entries exist as null/false rather than refusing.
32. Missing/non-ticket/legacy cases return first refusal and never crash.
33. Spike with otherwise complete docs returns spike refusal (dominance).
34. Feature missing several docs and unresolved questions returns doc-missing refusal first, excluding question from missing.
35. After adding docs but retaining question, assert dedicated question refusal.
36. Taken by another/unknown actor returns occupancy refusal with `missing:[]`; same actor succeeds.
37. Missing stop section uses exact fallback; section parser cases pass.
38. Fresh/default-root call writes no `.kanmer`; ready/refusal calls do not alter ticket/activity bytes.
39. Existing single-document calls remain unchanged; if MCP-019 is present, batch and packet responses share independent versions.

### E. Reference and bundle

40. Add one row for `get_execution_packet` in `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` above `## Field semantics`.
41. Document refusal precedence, normal-result semantics, fixed index docs, extra listing, stop fallback, and same-actor occupancy once.
42. Run core tests/typecheck/build and all MCP smokes.
43. From a normal main checkout run plugin build/check and commit generated bundle.
44. Confirm no write/activity/worktree/stage change occurs and no second document API exists.

## Expected files

Add:
- `packages/mcp-server/src/execution-packet.ts`

Modify:
- `packages/core/src/store.ts`
- `packages/core/src/types.ts` (if public result types needed)
- `packages/core/src/store.test.ts`
- `packages/mcp-server/src/index.ts`
- `packages/mcp-server/src/smoke.mjs`
- `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md`
- `plugins/kanmer/mcp/kanmer-mcp.cjs` (generated)

## Acceptance checks

- One call returns the complete authoritative bounded packet for a ready ticket.
- Refusal precedence exactly matches the five required classes.
- Chore-with-plan succeeds; spike refuses.
- Requirements derive from GateReport; no universal document demand.
- Plan/checklist/files carry independent content-version tokens; extras are path/version only.
- Group context is authoritative full text, not paraphrase.
- Stop condition/commands parsing and exact fallbacks are deterministic.
- Same actor may resume; other/unknown actor refuses with `missing:[]`.
- The tool is read-only, produces no activity/files/worktrees/stage movement, and shares MCP-019’s helper.
- Tool reference and plugin bundle are synchronized.

## Verification commands

```bash
npm test --workspace @kanmer/core
npm run typecheck
npm run build
node packages/mcp-server/src/smoke.mjs
npm run smoke:protocol
npm run smoke:discovery
```

From normal main checkout:

```bash
npm run plugin:build
npm run plugin:check
git diff --check
git status --short
```

## Risks / deviation rules

- Do not evaluate unresolved questions inside the earlier missing-doc refusal.
- Do not require files/checklist/research outside the resolved profile.
- Do not silently truncate/LLM-summarize group context.
- Do not return all extra document contents.
- Do not call `take_ticket`, initialize a board, update activity, or create Git state.
- Do not duplicate MCP-019’s batch logic or add another public document tool.
- Do not merge or begin SKILL-021/CORE-035.

## Stop condition

Stop when the complete ready/refusal matrix passes, a plan-only chore receives a bounded ready packet, every refusal is deterministic and read-only, document/group/version/section data are authoritative, the shared batch helper is the only document implementation, plugin/reference artifacts are synchronized, and the PR is ready for independent review. Do not merge or start blocked tickets.
