## Research working notes — 2026-08-28

- Worktree `.worktrees/core-116`, branch `core-116-delivery-policy` from `origin/main` `bf0eaed4`. `npm install` run there (no node_modules in a fresh linked worktree).
- Ticket moved backlog → preparing (governing-doc gate already satisfied by FRD-031 + ADR-0021).
- goal.md Phase 5 (delivery policy + delivery_state) and Phase 14 (release serialization, release lease, candidate identity, successor) are **separate approved phases**. That is the seam for the split the packet suggested.
- Three explicit in-repo hooks reserved for this ticket:
  - `packages/core/src/types.ts:931-934` — `ReconciliationEvidence.release.state` is `not-applicable | superseded | contended | unavailable`; every non-neutral value is a *release attempt* concept (Phase 14), so wiring it belongs to the second part, not the first.
  - `packages/mcp-server/src/reconciliation.ts:313` — hard-coded `"not-applicable"` with a comment forbidding a manufactured observation.
  - `packages/mcp-server/src/project-registry.ts:32-33` — `EndpointEntry.policy?: string`, "operator-declared delivery policy label, echoed back; CORE-116 defines its semantics".
- `BoardConfigSchema` is a plain `z.object()` (strips unknown keys on read AND on write). The installed **stable v0.3.12** bundle has neither `claimExpiryMinutes` nor `leaseHeartbeatMinutes` (grep of `kanmer-mcp.cjs` = 0 hits), so a stable-server/GUI whole-board save already drops candidate config keys. Precedent set by CORE-115; and Kanmer's own board must NOT gain a delivery block anyway (FRD-031: "Kanmer's own repository policy is not changed merely to demonstrate another policy"), so the practical exposure is nil.
- `ItemFrontmatterSchema` is `.passthrough()` — per-ticket `delivery_*` fields survive a stable-server write unchanged. Asymmetry is the reason delivery *state* goes on the ticket and delivery *policy* goes in board.yml.
- `check-pr.mjs:37,39` reads `pull_request.base.sha` but **discards `base.ref`**; `MergeGatePrInput` (merge-gate.ts:16-21) has no base branch at all. Neither hardcodes `main`. `.github/workflows/pr.yml` does hardcode `main` — that is Kanmer's own repo policy and stays.
- `leaseConfig(board)` (`types.ts:794`) + `get_status.leases` (`index.ts:683`) is the exact pattern to mirror for `deliveryPolicy(board)` + `get_status.delivery`.
- `ExecutionPacketReady` (`execution-packet.ts:123-152`) carries no branch targets — that is where FRD-031's "exact base SHA, base branch, PR target, verification target" must land.
- Tool roster is asserted literally as 39 in `smoke.mjs:69`. Prefer extending `update_item` / `get_execution_packet` / `get_status` over a new tool (goal.md NO-CHURN rule).
