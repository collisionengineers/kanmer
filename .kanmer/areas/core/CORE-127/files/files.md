# Files — CORE-127

Exact authorised implementation surface after rebasing onto the CORE-126 merge. A file not listed here requires a versioned files/plan correction before editing.

| Action | Repo-root-relative path | Responsibility |
|---|---|---|
| Modify | `packages/core/src/plan.ts` | Strict repository-relative path parsing, documented glob subset and evidence-pin matching |
| Modify | `packages/core/src/plan.test.ts` | Path-confinement, glob and live-evidence negatives |
| Modify | `packages/core/src/step-packet.ts` | `step-packet/2`, canonical verification, checklist/baseline shape and pure changed-path classification |
| Modify | `packages/core/src/step-packet.test.ts` | Packet-version/digest, baseline, path classification, staleness and checklist deviation cases |
| Add | `packages/mcp-server/src/step-reconciliation.ts` | Bounded Git workspace snapshot and packet/evidence reconstruction shared by the two existing read-only tools |
| Add | `packages/mcp-server/src/step-reconciliation.test.mjs` | Real fixture-worktree snapshot, rename/untracked/hash/error and read-only cases |
| Modify | `packages/mcp-server/src/execution-packet.ts` | Stable document snapshot, proven worktree baseline, prior-packet gate and next-packet issuance |
| Modify | `packages/mcp-server/src/reconciliation.ts` | Add optional packet-aware inspection while preserving the existing delivery/claim recommendation |
| Modify | `packages/mcp-server/src/reconciliation.test.mjs` | Packet-aware response integration, missing evidence and no-write assertions |
| Modify | `packages/mcp-server/src/index.ts` | Extend only `reconcile_ticket` and `get_execution_packet` schemas/descriptions |
| Modify | `packages/mcp-server/src/smoke.mjs` | End-to-end constrained-step issuance, fail/inconclusive refusal and next-step gating |
| Modify | `AGENTS.md` | Canonical constrained-step reconciliation and supported path-pattern contract |
| Modify | `plugins/kanmer/skills/kanmer-plan/SKILL.md` | Authoritative repo-relative path and supported glob guidance |
| Modify | `plugins/kanmer/skills/kanmer-execute/SKILL.md` | Worker return and exact prior-packet reconciliation hand-off |
| Modify | `plugins/kanmer/skills/kanmer-auto/SKILL.md` | Controller requirement to reconcile the exact packet before issuing another |
| Modify | `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | Exact inputs/results for packet-aware `reconcile_ticket` and prior-packet issuance |
| Modify | `scripts/verify-skill-prose.mjs` | Pin the shipped constrained-step command/ordering contract |
| Modify | `scripts/verify-skill-prose.test.mjs` | Regression tests for those prose assertions |
| Regenerate | `plugins/kanmer/mcp/kanmer-mcp.cjs` | Committed standalone MCP bundle |

## Explicitly outside this ticket

- `packages/core/src/store.ts`, batch manifests/lease ownership and merge-gate behavior owned by CORE-126.
- CORE-133 abandoned-claim classification and FAIL merge-SHA routing.
- CORE-129 proof schema/consistency enforcement.
- GUI, governing FRD/ADR/PRD files, release records, delivery policy, workflow stages and package dependencies.
- Any provider, credential or unrelated local configuration.
