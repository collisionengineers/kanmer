# Checklist — SKILL-038

## Implementation and consolidated remediation

- [x] Rebase the existing branch/worktree onto exact green main
  `add0da7fc17968796f43b3035065de400a4db2d4`.
- [x] Collapse the branch to one truthful SKILL-038 commit with no CORE-128
  remediation claim.
- [x] Apply ordinary exclusions, including live foreign claims, before
  dependency-graph construction.
- [x] Resolve external-blocker exclusions to a fixed point before classifying
  remaining internal dependencies.
- [x] Detect every cyclic SCC and self-loop, recording complete members and an
  ordered witness path.
- [x] Give cycle members and all transitive downstream dependents terminal
  blocked dispositions naming the originating cycle; dispatch none.
- [x] Keep unrelated safe lanes running and set run-wide `blocked` only after
  every safe lane is terminal.
- [x] Keep safe acyclic in-roster dependents queued behind their blockers.
- [x] Reconcile every schema-1/schema-2 worker and require proven quiescence
  before terminally closing the legacy run or creating a schema-3 successor.
- [x] Preserve active or uncertain legacy records and pointers byte-for-byte,
  create no successor, and hand off exact evidence.
- [x] Stamp schema 3 as the first retry-budget/counter schema and refuse
  absent, unknown, or malformed new-run records.
- [x] Stamp both run templates schema 3 while preserving pointer/history
  separation and the retry budget/counter.
- [x] Update root `AGENTS.md` for the ordered blocker pipeline, cycle
  propagation, independent lanes, retry limit 2, and quiescent schema
  transition.
- [x] Mutation-pin foreign-claim ordering, downstream cycle closure, multiple
  cycles/self-loops, independent lanes, active/uncertain/quiescent legacy
  transitions, templates, and AGENTS without weakening an existing assertion.
- [x] Keep every SKILL-038 fixture teardown on
  `removeTreeWithRetrySync`; zero bare `rmSync(` calls.
- [x] Re-prove mandatory stop predicates: 1,877 bytes and SHA-256
  `03796a0e22ae67a371b1ddb58bbccdf4f08b3d5d9442eb47f59a27c6e9e19b38`.
- [x] Audit the final diff: exactly six declared files, no `packages/**`, no
  dependency or workflow change.
- [x] Retain all earlier exact-head verification attempts and their original
  PASS, FAIL, or INCONCLUSIVE disposition.
- [x] Commit with `Kanmer: SKILL-038`.
- [x] Final focused validator and mutation suite pass at exact commit
  `0eece7d6eaa1272696095e84eee7e43397702729` (41/41 mutation tests).
- [x] Retain the first clean-checkout rail at the same exact head as
  INCONCLUSIVE: all preceding suites passed and only the release-notes URL test
  failed because the standalone clone inherited a filesystem origin.
- [x] Change only the verification clone's `origin` metadata to the canonical
  GitHub URL; focused release-notes test passes 1/1.
- [x] One complete authoritative Windows `npm run verify` rail passes at exact
  commit `0eece7d6eaa1272696095e84eee7e43397702729`: core 562/562,
  GUI 524/524, MCP HTTP 144/144, scripts 149/149, MCP smoke 338/338,
  protocol 50/50, discovery 13/13, and AGENTS 31/31, plus typecheck,
  documentation, headless, MCPB, skills, and plugin synchronization.

## Review, merge, and verification

- [ ] Push exact final head `d10e79d1ac506e2e3b81a219a7c6749e670d45d9`
  with lease against remote head `0eece7d6eaa1272696095e84eee7e43397702729`.
- [ ] Confirm fresh `verify` and `kanmer-gate` are required on the new head.
- [ ] Wait for every expected automated reviewer on the exact head.
- [ ] Obtain one fresh independent delta review bound to the exact head and
  pushed board inputs.
- [ ] Publicly disposition and resolve every current GitHub thread.
- [ ] Replace the whole-file review attestation with an exact-head PASS.
- [ ] Sync the board and require exact-head `verify` plus `kanmer-gate` green.
- [ ] Merge PR #304 and verify the exact merge SHA.
- [ ] Write PASS proof, move through Verifying to Done, release the claim, and
  clean the workspace.

## Exact-head automated finding F-009

- [x] Make the section-3 proof-classified bounded `transient` verification
  route section 9's sole automatic command-retry exception.
- [x] Mirror the sole-exception invariant in root `AGENTS.md`.
- [x] Mutation-pin both deletion and broadening of the exception without
  weakening the general no-retry rule.
- [x] Re-run focused checks and one complete rail at the amended exact head.

## Exact-head root-cause replan F-010–F-012

- [x] Permit only two fresh counted verifier entries into one budgeted route:
  an exact evidence-bootstrap request and a later `transient`-classified retry.
- [x] Require same job/SHA, untouched-path evidence and a mechanism hypothesis
  for bootstrap; prohibit controller self-classification and same-worker retry.
- [x] Resolve dependency retention against the requested target; terminally
  block all downstream dependents when that target cannot clear the blocker.
- [x] Complete one negative AGENTS mutation per independently guarded clause.
- [x] Re-run focused checks and one complete rail at exact immutable head
  `0eece7d6eaa1272696095e84eee7e43397702729`.


## Exact-head retry-state remediation F-013/F-014

- [x] Accept canonical `FAIL | INCONCLUSIVE` plus exact
  `failure_class: inconclusive` for evidence bootstrap, preserving every
  existing evidence and independence obligation.
- [x] Require a retained failed attempt when the bootstrap starts from
  `result: FAIL`; continue refusing PASS, NOT_APPLICABLE, missing result, and
  other classes.
- [x] Reserve `Transient` once per logical verifier attempt and reuse that
  reservation for the single confirmed pre-mutation launch retry.
- [x] Keep unknown status non-dispatching; never decrement or reset a
  reservation.
- [x] Mirror and independently mutation-pin both contracts in root
  `AGENTS.md`, the validator, and the mutation suite.
- [x] Re-amend one truthful SKILL-038 commit and re-run focused checks.
- [x] Run one complete clean Windows `npm run verify` rail at the next exact
  immutable head.


## Exact-head retry-capacity correction F-015

- [x] Replace the literal two-attempt cap with exactly two authorization paths.
- [x] Limit evidence bootstrap to one admission per ticket/run.
- [x] Permit classified-transient admissions while durable budget remains.
- [x] State that raising the limit adds classified-path capacity, never a third path.
- [x] Mirror and independently mutation-pin the contract in AGENTS and scripts.
- [x] Re-run focused checks and one clean complete Windows rail at the amended head.
