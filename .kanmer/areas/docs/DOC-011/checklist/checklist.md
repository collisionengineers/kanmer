# Checklist — DOC-011

## Allocation and ADR

- [ ] Re-list `docs/architecture/adr/` immediately before implementation and confirm ADR-0016 is still the next free number.
- [ ] If ADR-0016 is occupied, allocate the next free number and update every filename, cross-reference, ticket ref, and checklist entry consistently.
- [ ] Create the compiled-workflow ADR from the repository template with accepted status and current evidence date.
- [ ] Define the four audience contracts using the existing artifacts only.
- [ ] Define the four readiness predicates over the six fixed stages.
- [ ] State that `enter-verifying` remains reserved and has no injected requirement.
- [ ] State that GitHub required checks and protection provide merge physics while Kanmer records workflow intent/evidence.
- [ ] Document the optional `expected_project` compatibility window and sniff-before-send rule.
- [ ] Document custom profile as backfill/import policy without adding a runtime creation prohibition.
- [ ] Record groups + `blocks` as the settled structure and explicitly reject new hierarchy/stages/gated types.
- [ ] Record all MASTERPLAN non-goals: leases/heartbeats, overlay engine, role servers, metrics/golden board, GitHub App, format 4, profile materialization, content-scored gates, merge queue, and auto-merge.
- [ ] Document rejected alternatives and operational consequences.
- [ ] Link relevant existing ADRs and every amended FRD.

## FRD deltas

- [ ] Amend FRD-002 with the four profile-resolved readiness predicates and custom/backfill guidance.
- [ ] Preserve `get_doc_gates`/resolved profiles as authority; add no duplicate requirement table.
- [ ] Amend FRD-007 with six stages, boundary mapping, reserved `enter-verifying`, and GitHub merge boundary.
- [ ] Explicitly reject a seventh integration stage.
- [ ] Amend FRD-003 with ticket/group approval surfaces, gate-exempt scratch review, Scratch tab, and first-group context pane.
- [ ] Amend FRD-006 with exact proof frontmatter, typed attempts/results, retained failures, whole-file versioned replacement, and detached exact-merge-SHA verification.
- [ ] State explicitly that a FAIL proof still satisfies the structural existence gate and that skills/checks prevent completion.
- [ ] Amend FRD-010 with the execution-packet ready/refusal contract, profile-derived readiness, no-write semantics, and separation from take/dispatch.
- [ ] Amend FRD-016 with actual/canonical board-path refusal, normalization cases, optional no-worktree behavior, unchanged `force`, and no leases.
- [ ] Amend FRD-020 with exact observational health fields, branch override, active-ticket count, paired helper boundary, and operator-owned repair.
- [ ] Amend FRD-019 with Scratch, first-group context, exact four-mode mapping, starting-tab-only/dim-never-hide behavior, and non-blocking health banner.
- [ ] Amend FRD-022 with verified final tool count 31, exact fingerprint, optional write field on every mutation, call-level `create_items`, pre-init comparison, strip-before-store, status blocks, exact three codes, and packet surface.
- [ ] Amend FRD-023 with gates-first plan/auto, packet-first execute, current-head whole-file review, detached exact-SHA verify, stop conditions, and audience templates.
- [ ] Preserve historical verification text using explicit supersession/end-state sections rather than silently rewriting history.
- [ ] Confirm no raw seed keys such as `S-05` remain in durable specifications.

## Generated documents and verification

- [ ] Do not hand-edit `docs/contributing/doc-structure.md`.
- [ ] Run only its documented generator if the authoritative source inputs are changed by this ticket; otherwise leave it untouched and report the stale generated mirror separately.
- [ ] Run `node scripts/check-doc-numbering.mjs` and retain the zero exit code/output.
- [ ] Run the repository tests and `npm run verify` from the correct normal checkout.
- [ ] Search amended docs for contradictory seven-stage, old scratch-path, mutable-main verification, universal-research, tool-count-30, or mandatory-fingerprint statements.
- [ ] Run `git diff --check` and inspect every new/modified Markdown file for valid frontmatter, headings, links, and terminology.

## Kanmer ticket references

- [ ] Re-read MCP-022 and link the compiled-workflow ADR plus FRD-022 using Kanmer tools.
- [ ] Re-read MCP-023 and link the ADR plus FRD-010 and FRD-022.
- [ ] Re-read GUI-096 and link the ADR plus FRD-003 and FRD-019.
- [ ] Re-read GUI-097 and link the ADR plus FRD-019.
- [ ] Re-read GUI-098 and link the ADR plus FRD-019 and FRD-020.
- [ ] Use fresh `expected_updated` values for every metadata mutation; re-read and reapply on conflict.
- [ ] Set `docs_todo:false` only after all required paths for that ticket exist and link successfully.
- [ ] Re-read all five tickets and confirm exact refs, no duplicate paths, and `docs_todo:false`.
- [ ] Run `get_doc_gates` for all five and confirm governing-document readiness remains passable.
- [ ] Record each returned ticket update/version in the implementation report.

## Scope and hand-off

- [ ] Confirm the source diff is one new ADR plus only FRD-002/003/006/007/010/016/019/020/022/023.
- [ ] Confirm the board metadata diff affects only refs/docs_todo on MCP-022, MCP-023, GUI-096, GUI-097, and GUI-098, plus DOC-011’s own workflow docs.
- [ ] Confirm no product code, profile/gate configuration, board.yml, root manifesto, package, lockfile, plugin bundle, or manually generated document changed.
- [ ] Open the PR with `Kanmer: DOC-011` and list every governing file and ticket metadata mutation.
- [ ] Request independent architecture/document review.
- [ ] Stop at review readiness; do not merge or begin CORE-035.

## Progress notes

Append the allocated ADR number, numbering output, amended requirement identifiers, exact linked paths/ticket revisions, search results, verification exits, and any dependency-contract reconciliation here.
