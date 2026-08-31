# Plan — CORE-133: complete reconciliation recovery without widening authority

## Objective

Make the existing reconciliation classifier recommend the already-authorised transfer for real missing and unrecorded expired workspaces, while preserving every unsafe refusal, and require a FAIL proof to bind to the exact current merge SHA before backward routing. Protect the already-fixed reconcile/apply description without creating source churn.

## Starting state

- Audited source base: `4fda54b4489fa4bc4b6b091c2af67715245ffa08`.
- Research: `research/research.md`@`08ccbf6efc7a388a`.
- Files: `files/files.md`@`fe0e5c8e64a716bc`.
- CORE-127 is active and overlaps MCP reconciliation/tests/index/smoke/bundle. CORE-133 starts only after its exact merge, rebase and result-shape revalidation.
- Collector/store/apply behavior already supports missing and unrecorded transfer; only classifier reachability is wrong.
- CORE-132 already corrected the stale `reconcile_ticket` description.

## Governing contract

- FRD-028 names expired claims with dirty work, missing worktree or no surviving work and requires safe current-state recovery.
- HZN-008 forbids deletion of dirty work and protects `.worktrees/kanmer`.
- The frozen release outcome requires missing/unrecorded/clean/dirty recovery, continued board/foreign/branch refusal, current-merge-SHA FAIL routing and a truthful tool description.

## Ordered steps

### Step 1 — Rebase and pin failing-first evidence

- Rebase the ticket branch onto the exact CORE-127 merge.
- Re-read CORE-127's `reconcileTicket` signature, optional step result, tool schemas/descriptions, tests and bundle.
- Add failing pure tests for `missing + unavailable`, `not-recorded + not-applicable`, synthetic `missing + matches-claim`, and stale FAIL for implementation/plan.
- Add failing MCP end-to-end tests for real collector/apply missing/unrecorded cases.
- Stop and version the files/plan docs only if the merged contract requires a path outside the conditional list.

### Step 2 — Correct the pure classifier only

- Introduce one explicit recoverable-workspace predicate:
  - `clean | dirty + matches-claim`;
  - `missing + unavailable`;
  - `not-recorded + not-applicable`.
- Remove the unreachable synthetic missing combination.
- Preserve ordering: Review recovery first, expired nonterminal claim transfer next, terminal cleanup later.
- Keep live, terminal, board, foreign, branch-mismatch, detached and unavailable refusals unchanged.
- Add one proof merge-SHA mismatch guard before both PASS and FAIL Verifying routes.

### Step 3 — Prove apply preserves surviving authority/work

- Through `reconcileTicket` and `applyReconciliation`, recover:
  - an expired recorded claim whose worktree has been deleted;
  - an expired claim with no worktree recorded.
- Assert controller/lease ownership changes while branch/worktree/taken time and any surviving evidence remain preserved.
- Assert stale revision still conflicts and no direct delete/cleanup occurs.
- Assert board, foreign and branch mismatch remain refused by classifier and store.

### Step 4 — Pin already-fixed description and integrate CORE-127

- Assert `reconcile_ticket` says recommendations are applied through `apply_reconciliation` and does not claim no apply surface.
- Do not modify `index.ts` if the assertion already passes.
- Preserve packetless and packet-aware CORE-127 reconciliation response shapes and read-only annotations.
- Rebuild core/server and regenerate the standalone bundle; tool count stays 41.

### Step 5 — Verify and hand off

- Run focused core reconciliation tests, MCP reconciliation tests, smoke/protocol, typecheck, plugin build/check and `git diff --check`.
- Run one clean non-overlapping Windows `npm run verify` at the final head.
- Commit/push one bounded PR with `Kanmer: CORE-133`, record the post-implementation report, sync the board and stop in Review.

## Acceptance checks

- Expired missing+unavailable and not-recorded+not-applicable each yield `RECOVER_EXPIRED_CLAIM` and apply successfully.
- Clean/dirty+matches recovery remains valid.
- Live, terminal, board, foreign, branch-mismatch, detached, unavailable and synthetic missing+matches remain refused.
- Recovery never deletes a workspace or changes branch/worktree/taken evidence.
- Current-SHA implementation/plan FAIL routes correctly.
- Stale-SHA FAIL yields `PROOF_MERGE_SHA_MISMATCH`, no recommendation and no mutation.
- PASS exact-SHA behavior and transient/inconclusive routes remain unchanged.
- The tool description remains truthful after CORE-127 and the generated bundle matches source.
- Hosted verify, kanmer-gate and one fresh exact-head review pass.

## Deviation and failure rules

- No change to store transfer authority unless an end-to-end test proves the existing path cannot accept an approved shape.
- No new reconciliation action/tool or cleanup path.
- Do not absorb CORE-127/CORE-129/F-016 behavior.
- A deterministic failure gets one mechanism fix; do not repeat unchanged full rails.

## Stop condition

Stop implementation at Review with one clean exact-head PR and current report. Independent review, merge, exact-merge verification and closeout remain controller phases.
