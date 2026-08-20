# Plan — DOC-011: ADR-0016 and compiled-workflow FRD deltas

## Objective

Create one durable architecture decision and precise amendments to the existing feature specifications so every 0.4.0 compiled-workflow implementation has an authoritative governing path, without reintroducing a root manifesto or changing source behavior.

## Starting state

- ADRs stop at 0015; relevant FRDs exist but describe pre-compiled workflow behavior and several stale verified-against-code snapshots.
- Five feature tickets use `docs_todo` because governing deltas are not yet present.
- `docs/contributing/doc-structure.md` is generated and stale; manual editing is forbidden.

## Required changes

### 1. Allocate and author the ADR

1. Immediately before file creation, list ADR filenames and run the numbering check. If 0016 is occupied, use the next free number and replace every planned path/reference consistently.
2. Create the ADR from the repository ADR template with `status: accepted` (or repository-approved equivalent) and title “Compiled workflow: audience contracts, readiness predicates, and GitHub merge physics”.
3. Context must explain observed failures: one unreadable artifact serving four audiences, existence-only board evidence disconnected from GitHub, stale review/proof, wrong-project routing, and weak-agent context assembly.
4. Decision must define the four artifact contracts exactly:
   - Human approval: ticket body and first feature-group `context.md`.
   - Weak execution: bounded plan/checklist/files plus `get_execution_packet` and stop condition.
   - Strong review: whole-file `scratch/review.md` attestation bound to PR head, plan version, ticket timestamp, findings/dispositions.
   - Verification: whole-file `proof/proof.md` bound to exact merged SHA with retained typed attempts.
5. Define the four readiness predicates over fixed boundaries:
   - approval readiness (`leave-backlog`);
   - execution/dispatch readiness (`leave-preparing`);
   - review readiness (`enter-review`);
   - completion readiness (`enter-done`).
   State predicates are computed by the gate engine and are not columns/stages.
6. State six stages remain fixed and `enter-verifying` is reserved/uninjected.
7. State GitHub required checks/branch protection are physical merge enforcement; board stages/documents remain workflow intent/evidence.
8. Define `expected_project` optional compatibility window and sniff-before-send rule; defer mandatory enforcement to no earlier than the release after compatible clients/skills ship.
9. Define custom profile as backfill/import policy only for new work, without changing ungated create/import behavior.
10. List settled structural choices: groups + blocks, no parent/child; existing docs/folders; no new stage/type/hierarchy.
11. List explicit non-goals: leases/heartbeats, overlay engine, role-scoped servers, metrics/golden board, GitHub App, format 4, board profile materialization, content-scored hard gates, merge queue, automatic merge.
12. Alternatives: one universal ticket surface; new stages; content gates; board as merge boundary; mandatory fingerprint immediately; all rejected with operational reasons.
13. Consequences: stronger planner burden, simpler weak execution, advisory structured records until gate phases, stable job names, compatibility requirements, duplicated small Git inspectors.
14. Link every amended FRD and relevant ADR-0005/0009/0011/0014/0015.

### 2. Amend readiness/profile/stage FRDs

15. In FRD-002, add a dated/end-state section defining the four named predicates as evaluated profile boundaries, the governing-doc predicate exception for custom/backfill, and custom policy. Do not restate fixed per-profile document tables beyond existing authoritative content.
16. State profile resolution/get_doc_gates remains the source; skills/GUI/packet consume its result.
17. In FRD-007, add the exact six-stage/predicate mapping, multi-boundary movement behavior, reserved `enter-verifying`, and GitHub merge boundary. Explicitly reject a seventh “Integrated” stage.
18. Preserve existing historical/verified sections; append superseding end-state text with clear date/ticket rather than silently rewriting evidence.

### 3. Amend ticket-document/proof FRDs

19. In FRD-003, add audience roles for body/group context, plan/checklist/files, scratch review, proof; state scratch remains gate-exempt even when visible in GUI.
20. Define `scratch/review.md` as the canonical review location and whole-file versioned replacement; defer exact schema reference to FRD-006/022 section where appropriate without duplication.
21. Document Scratch tab as read/write over existing scratch paths and first-group context as read-only above body.
22. In FRD-006, add exact proof top-level fields and enum from MCP-024, nested attempt fields/results, chronological retention, whole-file expected-version replacement, and exact merge SHA detached worktree verification.
23. State a `FAIL` record still structurally satisfies existence; skill/check choreography prevents Done on non-PASS. No hidden content gate.
24. Add review-attestation linkage if FRD-006 owns evidence records, while keeping its exact schema canonical in one place/reference rather than divergent copies.

### 4. Amend dispatch/take/worktree FRDs

25. In FRD-010, define `get_execution_packet` as the sole bounded weak-agent read and readiness/refusal semantics in exact order; it does not take/move/write/create worktrees.
26. State ready response derives profile requirements, permits chore-with-plan, refuses spike, and returns project/ticket/group/docs/extras/gates/stop/commands.
27. In FRD-016, add pure path refusal for actual board root and canonical `.worktrees/kanmer`, relative/absolute/mixed/Windows semantics; no-worktree remains allowed.
28. State `force` semantics are unchanged and no lease/heartbeat is introduced.
29. In FRD-020, add observational health fields/expected branch/active ticket count and non-blocking repair text; paired GUI/MCP inspectors are deliberately duplicated under existing package boundary; repair remains setup/ops.

### 5. Amend GUI and MCP FRDs

30. In FRD-019, add:
   - Scratch top-level editor tab using existing operations and gate-exempt data;
   - first `groups[0]` context pane above body;
   - local enum/mapping Approval→Ticket, Execution→Plan, Review→Scratch, Evidence→Proof;
   - starting-tab-only behavior and dim-never-hide;
   - board-health banner exact conditions/non-blocking behavior.
31. In FRD-022, recount final surface as 31 tools after `get_execution_packet`; verify registry rather than trusting prose.
32. Document exact fingerprint payload/key order/path canonicalization/prefix; boardSource displayed not hashed; machine-local.
33. Document optional `expected_project` on every write, `create_items` call-level only, compare before initialization, strip before store, compatibility status.
34. Document `get_status.project`, `boardWorktree`, and `compat.expectedProject` blocks.
35. Document exactly three codes and compatible text: WRONG_PROJECT, REVISION_CONFLICT, GATE_BLOCKED.
36. Document `get_execution_packet` fields/refusal order/read-only semantics and its use of shared multi-doc helper.

### 6. Amend skills FRD

37. In FRD-023, update roster behavior without changing roster count:
   - plan/auto gates-first and material-hole rule;
   - execute packet-first/capability sniff/never merge/stop condition;
   - review current head, whole-file record, findings dispositions/checks;
   - verify exact merged SHA detached worktree/proof/PASS-only;
   - approval/brief/group templates and advisory labels/decision verbs.
38. Remove or supersede statements that plan always starts from research/files or auto routes by hardcoded profile; preserve historical evidence with explicit supersession.
39. Reassert skills derive from gate/tool surface and plugin bundle is not rebuilt for skill-only changes.

### 7. Validate documents

40. Run Markdown/frontmatter review: statuses, headings, cross-links, terminology, exact field spelling, no raw catalog `S-xx` references.
41. Run `node scripts/check-doc-numbering.mjs` and its test through `npm test`/`npm run verify` as available.
42. Search for contradictions in amended files: seven stages, `scratch-<slug>`, mutable-main verify, universal research, tool count 30, mandatory fingerprint.
43. Do not manually edit `docs/contributing/doc-structure.md`. Run the documented generator only if available/authoritative and record generated source; otherwise leave unchanged and note separate stale-generator debt.
44. Run `npm run check:manual` only if manual generation is affected (it should not be by `/docs/` FRDs/ADR); do not regenerate unrelated in-app manual.
45. Run full `npm run verify`.

### 8. Link governing docs and retire `docs_todo`

46. After the ADR/FRD files exist on the implementation branch and path validation can see them, use `link_doc`/`update_item` through Kanmer for each exact mapping in `files.md`.
47. Use `expected_updated` from freshly re-read tickets; handle conflicts by reread/reapply.
48. Set `docs_todo:false` only after all required links for that ticket succeed.
49. Re-read each ticket and `get_doc_gates`; assert refs contain exact paths and governing-doc requirement is satisfied without debt.
50. Do not add refs to DOC-011 itself unless repository governance requires self-reference; its chore profile has no governing-doc boundary.
51. Record the returned updates/versions in implementation report.

### 9. Final scope audit

52. Confirm source diff is one new ADR plus exact ten FRD modifications and no product code/generated doc manual patch.
53. Confirm board diff only changes refs/docs_todo on the five named tickets and DOC-011’s own workflow docs.
54. Confirm tool count/field/schema statements match the merged implementation dependencies; if a dependency has changed spelling, update docs to actual shipped code, not this plan’s stale guess, and report the deviation.
55. Open PR with `Kanmer: DOC-011`, list every doc and ticket metadata mutation, and request independent architecture/doc review.

## Expected files

One new ADR and modifications to FRD-002, 003, 006, 007, 010, 016, 019, 020, 022, 023. No hand edit of generated doc structure.

## Acceptance checks

- ADR expresses one cross-cutting decision and all non-goals.
- Every named FRD owns its exact durable end-state behavior without contradictory duplicate sources.
- Six stages/four predicates/enter-verifying reservation are unambiguous.
- Existence gates, optional compatibility, custom/backfill policy, and no-lease semantics are preserved.
- Numbering and full verification pass.
- Five named tickets have exact refs and `docs_todo:false`, verified through Kanmer.

## Commands

```bash
node scripts/check-doc-numbering.mjs
npm test
npm run verify
rg -n "seven stages|researching → planning|scratch-<slug>|tool count 30|pull.*main" docs/architecture/adr/ADR-0016-* docs/functional/frd/FRD-{002,003,006,007,010,016,019,020,022,023}-*.md
git diff --check
git status --short
```

## Failure and deviation rules

- Never create a duplicate ADR number, hand-edit generated doc structure, invent behavior absent from merged dependencies, or rewrite historical evidence without supersession markers.
- Do not add a new FRD/manifesto, stage, hierarchy, gate type, lease, mandatory-token date, or product-code change.
- If a dependency is not merged or its actual contract differs materially, stop that delta and reconcile with its ticket rather than documenting fiction.
- Do not merge or start CORE-035.

## Stop condition

Stop when the collision-free compiled-workflow ADR and all ten FRD deltas accurately describe merged contracts, numbering/full verification are green, the five named tickets are linked and no longer carry `docs_todo`, generated docs were not hand-edited, and the PR is ready for independent review. Do not merge or begin CORE-035.
