# Research — DOC-011: compiled-workflow governing-document deltas

## Findings

- ADR numbering currently ends at ADR-0015; the next collision-free filename is `docs/architecture/adr/ADR-0016-compiled-workflow.md`. Run the numbering rail again immediately before commit because numbering is not reserved.
- The adopted design is cross-cutting and difficult to reverse, so one ADR is appropriate. It must explain the decision and non-decisions; detailed behavior belongs as deltas in existing feature FRDs.
- Existing six stages remain `backlog → preparing → implementing → review → verifying → done`. Readiness is expressed through four boundary predicates, not new columns:
  1. approval readiness at `leave-backlog`;
  2. execution/dispatch readiness at `leave-preparing`;
  3. review readiness at `enter-review`;
  4. completion readiness at `enter-done`.
  `enter-verifying` remains a reserved boundary understood by the evaluator but has no injected requirements.
- Four audience contracts use existing artifacts:
  - human approval: ticket body and first group `context.md`;
  - weak implementation: plan/checklist/files plus execution packet;
  - strong review: `scratch/review.md` SHA-bound attestation;
  - evidence: `proof/proof.md` exact-merged-SHA record.
- GitHub remains the physical merge boundary through `verify` and `kanmer/gate`; the board records intent/readiness but does not replace branch protection.
- Settled non-decisions must be explicit: no new hierarchy, stage, gated document type, lease/heartbeat, role-specific MCP binary, GitHub App, content-scored prose gate, or automatic merge.
- `expected_project` is optional during compatibility rollout. Updated clients sniff `get_status.compat.expectedProject`; old clients omit; mandatory no earlier than the release after sending clients/skills ship.
- `custom` remains legal for import/backfill, but new ordinary work uses feature/fix/chore/spike. This is policy/advisory, not a create-item hard gate; ungated creation/backfill is preserved.

## Exact FRD deltas

- **FRD-002:** name the four readiness predicates as profile-resolved boundary evaluations; stored profile configuration remains authority; readiness is not a stage.
- **FRD-003:** approval surface = body/first-group context; review attestation lives under gate-exempt scratch; scratch is visible/editable in Editor but never gate evidence; multiple docs/content-version behavior unchanged.
- **FRD-006:** normative proof frontmatter/attempt schema, exact merge SHA detached verification, retained failures, typed outcomes; existence gate remains structural even for FAIL.
- **FRD-007:** six stages unchanged; four readiness predicates map to existing boundaries; `enter-verifying` reserved/uninjected; GitHub—not an extra board stage—is merge physics.
- **FRD-010:** a ready `get_execution_packet` response is dispatch enablement; refusal order and no-write semantics; dispatch/take are separate.
- **FRD-016:** `takeTicket` refuses actual/canonical board worktree path; no-worktree remains allowed; existing `force` semantics unchanged; no leases.
- **FRD-019:** Scratch tab, first-group context pane, local Approval/Execution/Review/Evidence modes selecting starting tabs and dimming only, board-health banner.
- **FRD-020:** observational board-worktree health fields, expected branch override, GUI/MCP paired helpers, repair remains operations; no automatic repair/block.
- **FRD-022:** tool count becomes 31 after `get_execution_packet`; optional `expected_project` on every write; exact fingerprint; `get_status.project`, `.boardWorktree`, `.compat`; exactly three structured codes; compatible text; packet read contract.
- **FRD-023:** gates-first plan/auto, packet-first execute, whole-file SHA review, detached exact-SHA verify, audience templates; skills derive and no profile mapping.

## Generated document

- `docs/contributing/doc-structure.md` is a generated mirror and is visibly stale in the snapshot (format 2/seven stages). Do not hand-edit it. Use the repository’s documented generator/reconciliation path after governing/source model changes, and commit generated output only if the generator owns it in this ticket; otherwise file/retain a separate generator fix. The seed explicitly forbids manual editing.

## Ticket ref updates

After docs exist, use Kanmer `link_doc`/`update_item` on MCP-022, MCP-023, GUI-096, GUI-097, GUI-098:
- MCP-022 → ADR-0016 + FRD-022
- MCP-023 → ADR-0016 + FRD-010 + FRD-022
- GUI-096 → ADR-0016 + FRD-003 + FRD-019
- GUI-097 → ADR-0016 + FRD-019
- GUI-098 → ADR-0016 + FRD-019 + FRD-020
Then set `docs_todo:false` only after every path exists and links successfully.

## Remaining unknowns

None. Recheck the ADR number immediately before creating the file; if 0016 has landed concurrently, allocate the next free number and update ticket references in the same diff rather than creating a duplicate.
