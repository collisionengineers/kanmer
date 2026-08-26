# Plan — DOC-027: Codify reliable-autonomy operating model in governing documents

## Objective

Add one initiative PRD, eight single-capability FRDs, one stable-control ADR, and the documentation index entries that make HZN-008's approved operating model a durable, linkable repository contract.

## Starting state

- `docs/README.md` defines PRD/FRD/ADR roles and requires one crisp FRD acceptance list.
- PRD-001 is the earlier v3 initiative and remains intact.
- FRD-015, FRD-016, FRD-020, FRD-022, FRD-023 and ADR-0016 describe shipped foundations and deliberately exclude parts of the new model.
- HZN-008 is the approved programme contract; all eleven members are Backlog except this documentation ticket.
- DOC-027 research version `effa6bbc44ca0731` and files version `ae50366261df710e` identify the exact scope. No declared external research source applies.

## Governing docs

- **New PRD:** `PRD-002-reliable-autonomy-and-multi-controller-operation.md` records the product rationale, programme outcomes and non-goals authorized by `goal.md`.
- **New FRDs:** FRD-028 through FRD-035 each own one end-state capability named in the research; they are new durable contracts, not edits claiming the capability has already shipped.
- **New ADR:** ADR-0021 records the hard-to-reverse choice that released stable Kanmer controls the live board while candidate work uses ordinary workspaces or disposable/copied boards until promotion.
- **Preserved constraints:** FRD-015, FRD-016, FRD-020, FRD-022, FRD-023 and ADR-0016 are cited from the new documents where they constrain the new contract. No supersession is claimed unless a document's explicit status says so.
- The durable goal is explicit authorization for these new documents; no additional product decision is needed.

## Required changes

- Add the ten governing files named in `files/files.md`, all with existing directory/file-name conventions and an honest `draft` status pending implementation acceptance.
- Write each FRD as a durable end-state requirement with one acceptance set; do not include implementation checklists, machine paths, ticket-only findings or speculative provider claims.
- Update `docs/README.md` to index PRD-002, ADR-0021 and FRD-028–035 and preserve its reading-order/invariant prose.
- Replace DOC-027's `docs_todo` with its concrete refs after the files exist.
- Link every HZN-008 member to the specific FRD(s) and ADR it implements; preserve its group and dependency edges.
- Keep the horizon context as the cross-ticket operational summary rather than duplicating it into every FRD.

## Expected files

| Action | Repo-root-relative path | Responsibility |
|---|---|---|
| Add | `docs/product/prd/PRD-002-reliable-autonomy-and-multi-controller-operation.md` | Product rationale, success criteria and exclusions. |
| Add | `docs/functional/frd/FRD-028-rescue-and-reconciliation.md` | Recovery contract for CORE-113. |
| Add | `docs/functional/frd/FRD-029-logical-project-identity-and-endpoints.md` | Identity/endpoints contract for CORE-114 and MCP-054. |
| Add | `docs/functional/frd/FRD-030-renewable-workspace-leases-and-batches.md` | Lease/workspace contract for CORE-115. |
| Add | `docs/functional/frd/FRD-031-configurable-delivery-and-release-state.md` | Delivery/release contract for CORE-116. |
| Add | `docs/functional/frd/FRD-032-quick-capture-and-promotion.md` | Capture contract for CORE-117. |
| Add | `docs/functional/frd/FRD-033-constrained-preparation-and-step-packets.md` | Evidence/packet contract for CORE-118. |
| Add | `docs/functional/frd/FRD-034-durable-goal-control-and-independent-review.md` | Controller/review/verification contract for SKILL-036. |
| Add | `docs/functional/frd/FRD-035-golden-board-and-candidate-promotion-safety.md` | Evaluation/promotion contract for CORE-119. |
| Add | `docs/architecture/adr/ADR-0021-stable-control-plane-for-candidate-work.md` | Stable/candidate governance decision. |
| Modify | `docs/README.md` | Index the newly added governing documents only. |
| Modify | Kanmer ticket metadata | Replace temporary governing-document debt with exact refs for DOC-027 and HZN-008 members. |

## Do not modify

- Existing PRD-001, FRD-015/016/020/022/023 or ADR-0016 contents.
- Product code, package manifests, generated plugin/MCP artifacts, board-stage definitions, or unrelated active tickets.
- `.worktrees/kanmer` directly; ticket metadata changes go only through Kanmer MCP.

## Constraints

- Match `docs/README.md` naming/status conventions and the PRD/FRD/ADR granularity rule.
- Preserve the fixed file-backed board, six stages, dedicated board branch, central gate engine, Electron GUI and MCP server as explicit non-negotiables.
- State stable v0.3.12 as the live control plane; candidate work must not govern the live board before recorded promotion.
- Keep provider claims bounded to the approved goal or measured evidence. Do not add any dependency, database, scheduling platform or workflow engine by prose implication.
- Use repo-root-relative links only.

## Ordered steps

1. Add PRD-002 with the initiative problem, desired operating situations, success criteria and non-goals; cite the stable-control constraint.
2. Add FRD-028 through FRD-035, each limited to the outcome and acceptance mapping recorded in DOC-027 research; cross-reference only existing/new governing paths.
3. Add ADR-0021 with context, decision, alternatives and consequences for stable-control/candidate promotion and rollback.
4. Update the documentation index to make every new governing file discoverable.
5. Inspect the final files for names, statuses, links, one-capability FRD boundaries and absence of accidental as-built claims.
6. Link the new documents to DOC-027 and every HZN-008 member through MCP, clear `docs_todo`, then run the docs verifier and full repository verification.

## Acceptance checks

- Every path in the expected-files table exists with valid Markdown and no machine-specific path.
- PRD-002 states the approved programme without replacing PRD-001.
- Each FRD has one end-state capability, concrete requirements and an acceptance set matching its member-ticket outcome.
- ADR-0021 preserves stable-control/candidate separation and rollback; it does not create a new board stage or second source of truth.
- `docs/README.md` indexes all ten files.
- DOC-027 and all HZN-008 members reference their applicable governing docs and no longer rely on `docs_todo`.
- `npm run verify:docs` and `npm run verify` exit 0 from the ticket worktree; all output is recorded in the post-implementation report.

## Commands

- `rg --files docs/product/prd docs/functional/frd docs/architecture/adr` — confirm the ten added paths.
- `npm run verify:docs` — validate documentation-specific invariants from the ticket worktree.
- `npm run verify` — run the repository verification rail from the ticket worktree.
- `git diff --check` — reject whitespace errors before the PR.
- `git status --short` — confirm only planned documentation files changed before opening the PR.

## Failure and deviation rules

Stop and report if a required document conflicts with an existing approved contract, a filename/status convention is different from the researched convention, any required verification command fails, a document needs a new product decision, or scope expands into implementation. Do not silently change existing as-built documents, board state outside HZN-008, or candidate/stable authority.

## Stop condition

Stop after the documentation-only PR is open with exact ticket refs, recorded checks and a post-implementation report. Do not merge or begin a dependent ticket; independent review owns the next phase.
