# Checklist — DOC-011

## Allocation and ADR

- [x] Re-list `docs/architecture/adr/` immediately before implementation and confirm ADR-0016 is still the next free number.
- [x] If ADR-0016 is occupied, allocate the next free number and update every filename, cross-reference, ticket ref, and checklist entry consistently.
- [x] Create the compiled-workflow ADR from the repository template with accepted status and current evidence date.
- [x] Define the four audience contracts using the existing artifacts only.
- [x] Define the four readiness predicates over the six fixed stages.
- [x] State that `enter-verifying` remains reserved and has no injected requirement.
- [x] State that GitHub required checks and protection provide merge physics while Kanmer records workflow intent/evidence.
- [x] Document the optional `expected_project` compatibility window and sniff-before-send rule.
- [x] Document custom profile as backfill/import policy without adding a runtime creation prohibition.
- [x] Record groups + `blocks` as the settled structure and explicitly reject new hierarchy/stages/gated types.
- [x] Record all MASTERPLAN non-goals: leases/heartbeats, overlay engine, role servers, metrics/golden board, GitHub App, format 4, profile materialization, content-scored gates, merge queue, and auto-merge.
- [x] Document rejected alternatives and operational consequences.
- [x] Link relevant existing ADRs and every amended FRD.

## FRD deltas

- [x] Amend FRD-002 with the four profile-resolved readiness predicates and custom/backfill guidance.
- [x] Preserve `get_doc_gates`/resolved profiles as authority; add no duplicate requirement table.
- [x] Amend FRD-007 with six stages, boundary mapping, reserved `enter-verifying`, and GitHub merge boundary.
- [x] Explicitly reject a seventh integration stage.
- [x] Amend FRD-003 with ticket/group approval surfaces, gate-exempt scratch review, Scratch tab, and first-group context pane.
- [x] Amend FRD-006 with exact proof frontmatter, typed attempts/results, retained failures, whole-file versioned replacement, and detached exact-merge-SHA verification.
- [x] State explicitly that a FAIL proof still satisfies the structural existence gate and that skills/checks prevent completion.
- [x] Amend FRD-010 with the execution-packet ready/refusal contract, profile-derived readiness, no-write semantics, and separation from take/dispatch.
- [x] Amend FRD-016 with actual/canonical board-path refusal, normalization cases, optional no-worktree behavior, unchanged `force`, and no leases.
- [x] Amend FRD-020 with exact observational health fields, branch override, active-ticket count, paired helper boundary, and operator-owned repair.
- [x] Amend FRD-019 with Scratch, first-group context, exact four-mode mapping, starting-tab-only/dim-never-hide behavior, and non-blocking health banner.
- [x] Amend FRD-022 with verified final tool count 31, exact fingerprint, optional write field on every mutation, call-level `create_items`, pre-init comparison, strip-before-store, status blocks, exact three codes, and packet surface.
- [x] Amend FRD-023 with gates-first plan/auto, packet-first execute, current-head whole-file review, detached exact-SHA verify, stop conditions, and audience templates.
- [x] Preserve historical verification text using explicit supersession/end-state sections rather than silently rewriting history.
- [x] Confirm no raw seed keys such as `S-05` remain in durable specifications.

## Generated documents and verification

- [x] Do not hand-edit `docs/contributing/doc-structure.md`.
- [x] Run only its documented generator if the authoritative source inputs are changed by this ticket; otherwise leave it untouched and report the stale generated mirror separately.
- [x] Run `node scripts/check-doc-numbering.mjs` and retain the zero exit code/output.
- [x] Run the repository tests and `npm run verify` from the correct normal checkout.
- [x] Search amended docs for contradictory seven-stage, old scratch-path, mutable-main verification, universal-research, tool-count-30, or mandatory-fingerprint statements.
- [x] Run `git diff --check` and inspect every new/modified Markdown file for valid frontmatter, headings, links, and terminology.

## Kanmer ticket references

- [x] Re-read MCP-022; its refs include ADR-0016 and FRD-022, applied through Kanmer (activity 2026-08-20T22:27:27Z).
- [x] Re-read MCP-023; its refs include ADR-0016, FRD-010, and FRD-022, applied through Kanmer (activity 2026-08-20T22:27:27Z).
- [x] Re-read GUI-096; its refs include ADR-0016, FRD-003, and FRD-019, applied through Kanmer (activity 2026-08-20T22:27:27Z).
- [x] Re-read GUI-097; its refs include ADR-0016 and FRD-019, applied through Kanmer (activity 2026-08-20T22:27:27Z).
- [x] Re-read GUI-098; its refs include ADR-0016, FRD-019, and FRD-020, applied through Kanmer (activity 2026-08-20T22:27:27Z).
- [x] Fresh item reads and activity records confirm each metadata mutation used the current expected revision; no conflict occurred.
- [x] All five tickets set `docs_todo:false` only after their exact repository paths existed and refs were accepted; fresh gates pass.
- [x] Fresh reads of all five tickets confirm exact refs, no duplicates, and `docs_todo:false`.
- [x] Fresh `get_doc_gates` reads for all five report governing-document readiness passable.
- [x] Mapping activity timestamps and exact ref/readback evidence are recorded in the post-implementation report.

## Scope and hand-off

- [x] Confirm the source diff is one new ADR plus only FRD-002/003/006/007/010/016/019/020/022/023.
- [x] Confirm the board metadata diff affects only refs/docs_todo on MCP-022, MCP-023, GUI-096, GUI-097, and GUI-098, plus DOC-011’s own workflow docs.
- [x] Confirm no product code, profile/gate configuration, board.yml, root manifesto, package, lockfile, plugin bundle, or manually generated document changed.
- [x] Open the PR with `Kanmer: DOC-011` and list every governing file and ticket metadata mutation.
- [x] Request independent architecture/document review.
- [x] Stop at review readiness; do not merge or begin CORE-035.

## Progress notes

Append the allocated ADR number, numbering output, amended requirement identifiers, exact linked paths/ticket revisions, search results, verification exits, and any dependency-contract reconciliation here.


## Progress notes

- [x] ADR-0016 allocated; numbering command passed before and after the source change.
- [x] Source scope is the new ADR and the ten listed FRDs; generated doc-structure and product code were untouched.
- [x] Core tests 250/250, GUI tests 288/288, script tests 48/48, numbering and diff checks passed.
- [x] Post-merge mapping prerequisite is complete; all five mappings were read back on merged main and gates pass.
- [x] CORE-031 is merged; `npm run verify` passed on merged main and DOC-011 was re-read with gates before closeout.

---

## Closeout — DOC-011

- [ ] PR merge verified (`gh pr view --json state,mergedAt`)
- [ ] proof.md finalised (PR URL + merge date appended)
- [ ] Moved to final stage
- [ ] Outcome recorded in ticket body (PR link, follow-ups)
- [ ] cd out of worktree; `git worktree remove .worktrees/doc-011`
- [ ] `git branch -d doc-011-compiled-workflow` (`-D` if squash/rebase-merged)
- [ ] `git fetch --prune` + `git worktree prune`
- [ ] `take_ticket action: "release"`
