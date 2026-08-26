# Files — DOC-027

## Where the change lands

| Path | Why |
|---|---|
| `docs/product/prd/PRD-002-reliable-autonomy-and-multi-controller-operation.md` | New initiative-level product rationale and completion criteria. |
| `docs/functional/frd/FRD-028-rescue-and-reconciliation.md` | Durable recovery/reconciliation contract for [[CORE-113]]. |
| `docs/functional/frd/FRD-029-logical-project-identity-and-endpoints.md` | Logical identity, location fingerprints and named endpoint contract for [[CORE-114]] and [[MCP-054]]. |
| `docs/functional/frd/FRD-030-renewable-workspace-leases-and-batches.md` | Lease and batch-workspace contract for [[CORE-115]]. |
| `docs/functional/frd/FRD-031-configurable-delivery-and-release-state.md` | Delivery policy, release state and release channel contract for [[CORE-116]]. |
| `docs/functional/frd/FRD-032-quick-capture-and-promotion.md` | Capture and promotion contract for [[CORE-117]]. |
| `docs/functional/frd/FRD-033-constrained-preparation-and-step-packets.md` | Evidence, plan validation and packet contract for [[CORE-118]]. |
| `docs/functional/frd/FRD-034-durable-goal-control-and-independent-review.md` | Durable orchestration and bounded exact-SHA review/verification contract for [[SKILL-036]]. |
| `docs/functional/frd/FRD-035-golden-board-and-candidate-promotion-safety.md` | Golden evaluations and promotion/rollback contract for [[CORE-119]]. |
| `docs/architecture/adr/ADR-0021-stable-control-plane-for-candidate-work.md` | New immutable stable/candidate governance decision. |
| `docs/README.md` | Add PRD-002, ADR-0021 and FRD-028–035 to the durable-document index. |
| `DOC-027` and HZN-008 ticket metadata via Kanmer MCP | Replace `docs_todo` with exact governing-document refs and distribute each member's refs. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `docs/README.md` | Required document taxonomy, filename convention and the one-acceptance-list granularity test. |
| `docs/product/prd/PRD-001-kanmer-v3.md` | The earlier initiative's fixed principles and prior scope; PRD-002 is an additive initiative, not a rewrite. |
| `docs/functional/frd/FRD-015-ticket-and-board-core.md` | Existing item/revision semantics to extend without claiming unshipped identity/lease behaviour. |
| `docs/functional/frd/FRD-016-take-and-worktree-model.md` | Current one-ticket workspace model and explicit non-lease boundary. |
| `docs/functional/frd/FRD-020-board-git-worktree-sync.md` | Board worktree safety and no-force sync invariant. |
| `docs/functional/frd/FRD-022-mcp-server-surface.md` | Existing project check and MCP contract surface. |
| `docs/functional/frd/FRD-023-agent-skills-system.md` | Skill-as-choreography constraint. |
| `docs/architecture/adr/ADR-0016-compiled-workflow.md` | Current audience contracts and explicit excluded mechanisms. |
| `goal.md` | Approved programme direction and completion criteria; source material, not a repository governing doc. |
| `.worktrees/kanmer/.kanmer/groups/HZN-008/context.md` | Shared programme scope, ordering, WIP and no-churn constraints. |

## Ripple effects

- Every HZN-008 member becomes linkable to a concrete FRD/ADR before implementation planning.
- Plans and reviews will cite the new documents rather than restating the durable goal.
- The plugin's skill prose, MCP tool reference and public manual may need later changes under their implementation tickets; DOC-027 does not make those product changes.
- No compiled artifact changes are expected from documentation-only work.

## Out of scope

- Implementing any core, MCP, GUI or skill behaviour described by the new documents.
- Rewriting existing as-built FRDs to claim candidate behaviour is already shipped.
- Altering board stages, profiles, active release state, or unrelated older Review/Verifying tickets.
