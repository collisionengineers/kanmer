# Checklist — CORE-116

## Setup

- [x] Confirm `.worktrees/core-116` is on `core-116-delivery-policy` at `origin/main` `bf0eaed4`, deps installed
- [x] `take_ticket CORE-116` recording branch `core-116-delivery-policy` and worktree `.worktrees/core-116`

## Types and schema

- [x] Add `DeliveryConfigSchema` to `types.ts` beside `DeploymentConfigSchema`, all keys optional
- [x] Add `delivery: DeliveryConfigSchema.optional()` to `BoardConfigSchema` beside `deployment:`
- [x] Add `DELIVERY_STATES`, `DeliveryState`, `DeliveryPolicy` and `DEFAULT_INTEGRATION_BRANCH` to `types.ts`
- [x] Add the nine optional `delivery_*` fields to `ItemFrontmatterSchema`
- [x] Add the eight caller-settable delivery keys to `CreateItemInput` and `UpdateItemPatch` (via a shared `DeliveryPatch`)
- [x] Add the nine `delivery_*` keys to `KEY_ORDER` in `frontmatter.ts`, immediately after `deployment`
- [x] Export the new types/constants from `packages/core/src/index.ts` (wildcard re-export — no edit needed)
- [x] `npm run typecheck -w @kanmer/core` is clean

## Policy resolution

- [x] Add `resolveDelivery(board)` and `deliveryPolicySource(board)` to `board.ts` beside `resolveEnvironments`
- [x] Add `assertDeliveryPolicy(board)` and call it from `writeBoard()` beside `assertUniquePrefixes`
- [x] Update the configurables list in the `board.ts:27-33` doc comment
- [x] `delivery.test.ts`: defaults with no block, a partial block, `releaseBranch` defaulting to `integrationBranch`, and `policySource`
- [x] `delivery.test.ts`: `assertDeliveryPolicy` rejects an empty/whitespace branch and a `releaseCandidatePattern` without `*`

## Delivery state on the ticket

- [x] Add `assertDeliveryAgainstBoard(policy, merged)` to `store.ts` validating the merged post-patch record
- [x] Implement `DELIVERY_STATE_INVALID`, `DELIVERY_EVIDENCE_MISSING`, `DELIVERY_NO_CANDIDATE_POLICY`, `DELIVERY_TARGET_INVALID`, `DELIVERY_NO_BACKPORT_REQUIRED` — plus `DELIVERY_SHA_INVALID` (added; see the report)
- [x] Derive `delivery_backport_required` when `delivery_branch` is the release branch on a policy with `hotfixBackport` and a distinct integration branch
- [x] Stamp `delivery_recorded_at` on any delivery change; keep `delivery_backport_required` non-settable by callers
- [x] Wire delivery fields into `createItem` and `updateItem`, with `""` clearing one field, and extend change detection
- [x] `delivery.test.ts`: one case per refusal code, plus a clean round-trip and a `""`-clear

## FRD-031 acceptance fixtures

- [x] AC1 — main-only board resolves `main` for base/PR/verification targets and accepts `integrated` at `main` with an exact 40-hex SHA
- [x] AC1 — `integrated` without a 40-hex `delivery_sha` is refused
- [x] AC2 — dev→main board targets `dev`; the ticket reaches `done` on proof while `delivery_state` is only `integrated`
- [x] AC2 — the same ticket records `release-candidate` (with a candidate identity) then `released` with branch+tag, without changing its stage
- [x] AC5 — `delivery_branch: main` on the dev→main board auto-records `delivery_backport_required: dev`
- [x] AC5 — the obligation clears only on a 40-hex `delivery_backport_sha`
- [x] Edge case — a ticket with `delivery_state: released` and no `proof` is still refused entry to `done`, and the refusal names `proof`
- [x] Grep proof that no `delivery_*` reference exists in `gates.ts` or `profiles.ts` (also asserted in-test against `get_doc_gates`)

## Merge gate

- [x] Add `baseRef?: string` to `MergeGatePrInput` and `"WRONG_TARGET"` to `MergeGateFindingCode` and `SOFT_CODES`
- [x] Resolve the policy in `evaluateMergeGate` and add the check to `evaluatePhase2` after `DEPENDENCY_BLOCKED`
- [x] `delivery.test.ts`: `skipped` with no `baseRef`, `pass` on the integration branch, `pass` on the release branch for a recorded hotfix
- [x] `delivery.test.ts`: `warn` and `ok: true` by default on a wrong target, `fail` under `strict`
- [x] `check-pr.mjs` `readPrEvent` returns `base.ref` when present and passes it through, with no other CLI contract change
- [x] `packages/mcp-server/src/delivery.test.mjs` drives the CLI against a `integrationBranch: dev` board with a `main`-based event

## Execution material and MCP surface

- [x] Add the `delivery` block to `ExecutionPacketReady` with policy, `baseBranch`, `baseSha`, `baseShaState`, `prTarget`, `verificationTarget` and recorded state
- [x] Resolve `baseSha` with a bounded `git rev-parse` at the MCP boundary, degrading to `null` + `"unavailable"`
- [x] Confirm `step-packet.ts` and `STEP_PACKET_VERSION` are untouched
- [x] Add `delivery` to `get_status` beside `leases`
- [x] Add the eight delivery params to `update_item` and the fields to the item view
- [x] Widen `DispatchTask.prompt` to take a verification target; pass it from `index.ts`; leave both GUI preview call sites on the default
- [x] `smoke.mjs`: `get_status.delivery`, an `update_item` delivery round-trip, the packet delivery block, roster still 39

## Docs and artefact

- [x] `kanmer-execute/SKILL.md`: branch from the packet's base branch/SHA and `gh pr create --base <prTarget>`
- [x] `tool-reference.md`: `update_item` delivery fields and `get_status.delivery`
- [x] `AGENTS.md` §4 field lists and §8 gotcha 20 for board.yml-strips vs frontmatter-passthrough
- [x] `docs/manual/glossary.md`: "Delivery state" and "Integration branch" entries (+ `npm run build:manual` mirror)
- [x] Retarget the CORE-116 comments in `packages/core/src/types.ts` and `packages/mcp-server/src/reconciliation.ts` to CORE-132
- [x] `npm run build && npm run plugin:build && npm run plugin:check`; commit the rebuilt bundle

## Verification

- [x] `npm run typecheck` clean with all four workspaces named
- [x] `npm test -w @kanmer/core` green
- [x] `node --test packages/mcp-server/src/delivery.test.mjs` and `check-pr.test.mjs` green
- [x] `node packages/mcp-server/src/smoke.mjs` and `npm run smoke:protocol` green
- [x] `npm run verify` run with exit codes recorded; any failure attributed to a recorded host quirk or reported
- [x] Post-implementation report written with commands, exit codes, deviations and reviewer focus points
- [x] PR open against `main` with a `Kanmer: CORE-116` footer; ticket moved to Review

---

## Closeout — CORE-116

- [x] PR merge verified (`gh pr view 299 --json state,mergedAt` — MERGED, mergeCommit 28a12643f1721cf7607ce5427f55fae281ba5026)
- [x] proof.md finalised — already final (result PASS, verified_at 2026-08-28T05:08:08Z, bound to merge SHA)
- [x] Already in final stage (Done, not archived)
- [x] Outcome recorded in ticket body (scope split, carried-forward defect, residual risk, verification note)
- [ ] cd out of worktree; `git worktree remove .worktrees/core-116`
- [ ] `git branch -d core-116-delivery-policy` (`-D` if squash/rebase-merged) + delete remote branch
- [ ] `git fetch --prune` + `git worktree prune`
- [ ] `take_ticket action: "release"`
