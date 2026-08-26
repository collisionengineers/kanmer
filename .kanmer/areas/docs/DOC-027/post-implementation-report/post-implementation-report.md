# Post-implementation report — DOC-027

## Summary

DOC-027 adds the governing contract for HZN-008: PRD-002, eight single-capability FRDs (028–035), proposed ADR-0021 and the documentation index entries. The documents define the approved reliable-autonomy end state while explicitly describing it as candidate work; no product code, workflow stage or active release state changed.

## Changes

| File | Change | Why |
|---|---|---|
| `docs/product/prd/PRD-002-reliable-autonomy-and-multi-controller-operation.md` | added | States the initiative problem, goals, non-goals, requirements and success metrics. |
| `docs/functional/frd/FRD-028-rescue-and-reconciliation.md` | added | Governs dry-run-first recovery and safe invalid-state routing for [[CORE-113]]. |
| `docs/functional/frd/FRD-029-logical-project-identity-and-endpoints.md` | added | Governs logical identity, local fingerprints and named project endpoints for [[CORE-114]] and [[MCP-054]]. |
| `docs/functional/frd/FRD-030-renewable-workspace-leases-and-batches.md` | added | Governs renewable ownership and explicit batches for [[CORE-115]]. |
| `docs/functional/frd/FRD-031-configurable-delivery-and-release-state.md` | added | Governs policy, delivery state and release-channel serialization for [[CORE-116]]. |
| `docs/functional/frd/FRD-032-quick-capture-and-promotion.md` | added | Governs lightweight captures and deliberate promotion for [[CORE-117]]. |
| `docs/functional/frd/FRD-033-constrained-preparation-and-step-packets.md` | added | Governs evidence, concrete plans and packets for [[CORE-118]]. |
| `docs/functional/frd/FRD-034-durable-goal-control-and-independent-review.md` | added | Governs rostered control, independent review and exact-SHA verification for [[SKILL-036]]. |
| `docs/functional/frd/FRD-035-golden-board-and-candidate-promotion-safety.md` | added | Governs golden evaluations and promotion/rollback proof for [[CORE-119]]. |
| `docs/architecture/adr/ADR-0021-stable-control-plane-for-candidate-work.md` | added | Records the stable-control/candidate-isolation decision. |
| `docs/README.md` | modified | Indexes the new PRD, ADR and reliable-autonomy FRDs. |

## Governing docs

This ticket creates the governing documents authorized by the durable goal. It preserves FRD-015, FRD-016, FRD-020, FRD-022, FRD-023 and ADR-0016 as existing constraints rather than changing their as-built claims. ADR-0021 is a new proposed decision; the PRD and FRDs are draft end-state contracts until the programme implementation and review establish them.

The Kanmer ref validator resolves paths against the integration checkout. Therefore the exact refs for DOC-027 and HZN-008 members must be written after this PR's merge makes these documents present on the target branch; that intentionally remains a post-merge closeout action.

## Risks / follow-ups

- No implementation behavior ships in this PR. The HZN-008 member tickets own all code/skill/GUI work.
- The first full verification attempt was an environmental failure caused by this nested worktree inheriting incompatible root `node_modules`; it is retained in `scratch/execution.md`. After a worktree-local `npm ci --ignore-scripts`, the complete rail passed.
- `npm ci` reported pre-existing audit findings (4 low, 4 moderate, 4 high and 1 critical). No dependency remediation is included in documentation scope.

## Verification hand-off

On the exact merge SHA:

- Confirm PRD-002, FRD-028–035 and ADR-0021 are present and indexed by `docs/README.md`.
- Run `npm run verify:docs` and expect exit 0.
- Run `npm run verify` from an isolated checkout/dependency layout and expect exit 0.
- Update DOC-027 and every HZN-008 member with the applicable now-resolvable governing refs, then clear `docs_todo`.
- Confirm HZN-008 dependency edges and context remain unchanged.
