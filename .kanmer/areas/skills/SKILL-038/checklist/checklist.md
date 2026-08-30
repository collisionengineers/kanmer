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
- [x] Focused checks pass at exact commit `22c3cfa239e87893cc6fc639d27746273e614754`:
  core build, skill validator, 39/39 mutation tests, and `git diff --check`.
- [x] Retain the first final-head Windows rail: core 562/562 passed, GUI
  522/524 with two unchanged fixed-5-second launcher timeouts; the same-SHA
  focused launcher contract then passed 12/12.
- [x] Retain the externally interrupted same-SHA rail as INCONCLUSIVE, not
  PASS.
- [x] One clean complete Windows `npm run verify` rail passes at exact commit
  `22c3cfa239e87893cc6fc639d27746273e614754` on 2026-08-30.
- [x] Write the corrected final-head post-implementation report.
- [x] Commit with `Kanmer: SKILL-038`.

## Review, merge, and verification

- [ ] Push with lease against exact remote head
  `8010881c4e48ffabe97aba674361980f8ab3b279`.
- [ ] Confirm fresh `verify` and `kanmer-gate` are required on the new head.
- [ ] Wait for every expected automated reviewer on the exact head.
- [ ] Obtain one fresh independent delta review bound to the exact head and
  pushed board inputs.
- [ ] Publicly disposition and resolve all eight current GitHub threads.
- [ ] Replace the whole-file review attestation with an exact-head PASS.
- [ ] Sync the board and require exact-head `verify` plus `kanmer-gate` green.
- [ ] Merge PR #304 and verify the exact merge SHA.
- [ ] Write PASS proof, move through Verifying to Done, release the claim, and
  clean the workspace.
