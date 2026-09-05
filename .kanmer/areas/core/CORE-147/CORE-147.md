---
id: CORE-147
type: ticket
title: >-
  Make the verification contract project-declared: integration branch, workflow,
  required jobs and event drive receipt validation and the verify skill, with a
  proven designated-verifier fallback
status: verifying
area: core
assignee: claude-code
profile: fix
stageEntered:
  preparing: '2026-09-05T15:01:49.611Z'
  review: '2026-09-05T15:33:47.350Z'
  verifying: '2026-09-05T15:52:06.972Z'
taken_at: '2026-09-05T15:03:14.642Z'
branch: CORE-147-verification-contract
worktree: .worktrees/CORE-147
claim_expires_at: '2026-09-05T16:01:15.154Z'
claim_controller: claude-code
lease_id: 4bc5a7f2-3931-42a3-bdd8-f7f34f072145
lease_revision: 4
lease_workspace: 'worktree:c:\users\alex\documents\github\kanmer\.worktrees\core-147'
lease_provider: claude-code
lease_phase: implementing
lease_heartbeat_at: '2026-09-05T15:31:15.154Z'
labels:
  - evidence
  - receipts
  - reliable-autonomy
  - 0.4.2
  - portability
groups:
  - HZN-009
links:
  - MCP-057
  - CORE-129
refs:
  - docs/functional/frd/FRD-006-typed-proof.md
commits:
  - 4a1c3a235ccd9f5bfd8ef8ccee18959a15c0fa5d
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/330'
archived: false
created: '2026-09-05T14:03:46.047Z'
updated: '2026-09-05T15:52:06.972Z'
---

## Problem

`packages/core/src/proof-receipts.ts` (MCP-057, unchanged by CORE-129) accepts a receipt only when `workflow === "pr.yml"`, `job === "verify"` and `event === "push"`. Those literals ship inside `@kanmer/core` to every consuming repository, and `kanmer-verify` repeats the same assumptions in its `gh run list --workflow pr.yml --event push` lookup and its "checks that are a subset of `npm run verify`" coverage rule — even though the managed instructions now say to use the configured integration branch. A consuming repository whose application workflow is named differently, or whose CI runs on pull requests and pushes to `main` but not on pushes to its configured integration branch, has no receipt Kanmer will accept, so the evidence-first verification shipped in 0.4.2 benefits only Kanmer's own repository. The `run_id` presence-only validation (MCP-057 review F-002) is the same class.

(Pulled from 0.5.0 into 0.4.2 on 2026-09-05 after an external review of the merged R1 work; the recovery capability is not "ready for other repositories" while the contract is hardcoded.)

## Outcome

A **project verification contract** declared on the board — extending the existing `delivery` block rather than adding a parallel concept — names the integration branch (already `delivery.integrationBranch`), the post-integration workflow, the required job set and the triggering event. `assessReceipt` and the reconciliation findings read that contract; the verify skill reads it from `get_status` and never hardcodes names. Where a repository has no suitable post-integration run at the exact merge SHA, the skill's existing fallback — the single designated verifier runs the missing obligations in a detached worktree — is proven, not assumed. Exact-revision matching and the truthful success requirements are unchanged: a PR-event run is never accepted as final-merge evidence unless the contract says the integration run is a PR run **and** the receipt's `head_sha` equals the merge SHA. No other repository's workflows are renamed to satisfy Kanmer.

## Acceptance

- `BoardConfig.delivery.verification` (zod, optional, additive): `{ workflow: string; jobs: string[]; event: "push" | "pull_request" | "workflow_run" }`; `resolveDelivery(board)` returns it with defaults `{ workflow: "pr.yml", jobs: ["verify"], event: "push" }` and `source: "default" | "board"`; `get_status.delivery.verification` exposes the effective contract. Kanmer's own board keeps the default.
- `assessReceipt(receipt, { mergedSha, contract })` accepts a receipt whose `workflow`/`job`/`event` match the contract and rejects others with reasons naming the expected values; `run_id` and `attempt` must be positive integers; `provider`/`repo` non-empty. `PROOF_RECEIPT_REJECTED` messages name the contract values. Table cases: default contract (every existing MCP-057/CORE-129 case unchanged); a board declaring `workflow: ci.yml, jobs: ["build","test"], event: push` accepting a matching receipt and rejecting `pr.yml`/`verify`; a receipt covering only one of two required jobs is rejected as incomplete; `run_id: 0`, `run_id: "abc"`, `attempt: 0`.
- `kanmer-verify/SKILL.md` step 3 reads `get_status.delivery.integrationBranch` and `delivery.verification`, builds the `gh run list --workflow <workflow> --event <event> --commit <mergeSha>` lookup from them, requires every job in `jobs` to be `completed`/`success`, and states the coverage rule as "obligations the contract's jobs run", not "`npm run verify`". Step 5's fallback is explicit: no matching run at the exact merge SHA → every obligation is `missing` → the designated verifier runs them in the detached worktree and the proof records `receipts: []` with the reason.
- Fallback proven by test: a golden-board or smoke scenario (or a `node:test` in `packages/mcp-server`) where the contract names a workflow that has no run at the merge SHA yields `missing` for every obligation and a PASS proof with no receipts is still accepted by the CORE-129 parser and by `reconcile_ticket` (no `PROOF_RECEIPT_*` finding).
- `kanmer-setup` documents how a consuming repository declares its contract in `board.yml` (`delivery.verification`), with the explicit note that a workflow which does not run on pushes to the integration branch will always take the fallback until the repository adds such a run; `docs/manual/proof.md` and FRD-006 updated; AGENTS.md §4 `board.yml` example shows the block.
- `npm run golden`, core and mcp-server tests, `verify:skills`, `verify:docs`, `check:manual`, `plugin:check` green; tool roster still 41.

## Out of scope

Provider provenance verification (`VerificationHost`, R2-EVIDENCE); receipt storage or reuse keys; changing any other repository's CI; content-based or ancestry-based reuse.

## Technical seam

`packages/core/src/types.ts` (`DeliveryPolicy`, `BoardConfig.delivery`), `packages/core/src/board.ts` (`resolveDelivery`), `packages/core/src/proof-receipts.ts` (`assessReceipt`), `packages/core/src/reconciliation.ts` (`receiptAssessmentRejections` gets the contract from the evidence), `packages/mcp-server/src/reconciliation.ts` / `index.ts` (`get_status.delivery`, evidence assembly), `packages/mcp-server/src/golden-board.mjs` or `smoke.mjs` (fallback scenario), `plugins/kanmer/skills/kanmer-verify/SKILL.md`, `plugins/kanmer/skills/kanmer-setup/SKILL.md`, `docs/manual/proof.md`, `docs/functional/frd/FRD-006-typed-proof.md`, `docs/functional/frd/FRD-031-configurable-delivery-and-release-state.md`, `AGENTS.md` §4.
