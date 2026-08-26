# Research — DOC-027: reliable-autonomy governing contract

## Question

Which new governing documents are required to make the approved reliable-autonomy programme inspectable without duplicating existing shipped behaviour or creating one overloaded specification?

## Findings

- The live board is format 3 on the dedicated `kanmer-board` worktree, its expected-project fingerprint is active, and v0.3.12 is installed as the stable control plane.
  - Source: `get_status` on 2026-08-26; HZN-008 context records candidate work must not govern the live board before promotion.
- Existing FRD-015 already covers atomic board writes, item-level `expected_updated`, document versions and the present item model; it has no logical project UUID, durable controller identity, lease or delivery-state contract.
  - Source: `docs/functional/frd/FRD-015-ticket-and-board-core.md`.
- Existing FRD-016 deliberately defines the earlier one-ticket-per-worktree execution model and states its path guard is not a lease/heartbeat mechanism.
  - Source: `docs/functional/frd/FRD-016-take-and-worktree-model.md`.
- ADR-0016 compiles approval/execution/review/verification predicates from the six fixed stages but expressly excludes leases, golden boards, role-specific servers, release queues and automatic merge.
  - Source: `docs/architecture/adr/ADR-0016-compiled-workflow.md`.
- FRD-022 exposes a machine-local expected-project fingerprint during a compatibility window and currently enumerates only WRONG_PROJECT, REVISION_CONFLICT and GATE_BLOCKED as compatible structured errors.
  - Source: `docs/functional/frd/FRD-022-mcp-server-surface.md`.
- FRD-010 scopes the existing dispatch surface to one granular deliverable and `get_execution_packet`; it is not durable multi-ticket orchestration.
  - Source: `docs/functional/frd/FRD-010-task-scoped-dispatch.md`.
- FRD-020 fixes the dedicated board worktree and non-force sync rules. It must remain a safety constraint; recovery and promotion must not mutate `.worktrees/kanmer` casually.
  - Source: `docs/functional/frd/FRD-020-board-git-worktree-sync.md`.
- FRD-023 says skills are choreography rather than contract; a new goal controller must derive state from core/MCP guards rather than make prose the source of truth.
  - Source: `docs/functional/frd/FRD-023-agent-skills-system.md`.
- There are no project-declared external research sources applicable to DOC-027.
  - Source: `get_sources(area: docs, labels: reliable-autonomy)` returned `declaredCount: 0`.

## Implications

Create one initiative PRD, eight end-state FRDs, and one ADR rather than rewriting the older as-built documents:

1. `PRD-002-reliable-autonomy-and-multi-controller-operation.md` — product need and programme-level success criteria.
2. `FRD-028-rescue-and-reconciliation.md` — dry-run/apply recovery and safe invalid-state routing.
3. `FRD-029-logical-project-identity-and-endpoints.md` — stable project identity, local fingerprints, named endpoints and cross-project isolation.
4. `FRD-030-renewable-workspace-leases-and-batches.md` — renewable ownership, isolated/batch workspace rules and recovery.
5. `FRD-031-configurable-delivery-and-release-state.md` — integration/release policy, delivery state and one release lease per channel.
6. `FRD-032-quick-capture-and-promotion.md` — lightweight captures and deliberate promotion.
7. `FRD-033-constrained-preparation-and-step-packets.md` — shared/ticket evidence, concrete plans and compiled packets.
8. `FRD-034-durable-goal-control-and-independent-review.md` — rostered controller, exact-head review, exact-merge verification and finite failure routing.
9. `FRD-035-golden-board-and-candidate-promotion-safety.md` — disposable evaluations, stable/candidate promotion and rollback proof.
10. `ADR-0021-stable-control-plane-for-candidate-work.md` — stable v0.3.12 controls the live board; candidates use isolated/copied boards until explicit promotion.

This passes the FRD granularity test: each FRD has one durable end-state capability and one acceptance set. Existing FRD-015/016/020/022/023 and ADR-0016 are linked as constraints rather than duplicated. The PRD establishes why; the ADR captures the difficult-to-reverse stable/candidate boundary.

## Open questions

- None. The durable goal supplies the product decisions; implementation-specific questions belong in the member tickets after the corresponding FRD is linked.
