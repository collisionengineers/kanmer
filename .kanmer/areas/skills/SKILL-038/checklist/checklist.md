# Checklist — SKILL-038

## Implementation and consolidated remediation

- [x] Rebase the existing branch/worktree onto exact
  `add0da7fc17968796f43b3035065de400a4db2d4`.
- [x] Collapse the branch to one truthful SKILL-038 commit with no CORE-128
  remediation claim.
- [x] Keep acyclic in-roster dependents queued behind their blockers.
- [x] Exclude external blockers with their ids and disposition reported.
- [x] Detect cycles/self-loops before internal retention; name the ordered path
  and complete member set, block every member and the run, and dispatch none.
- [x] Stamp schema 3 as the first retry-budget/counter schema.
- [x] Preserve and terminally close schema-1/schema-2 records under their own
  contract; create a distinct schema-3 successor instead of rewriting in place.
- [x] Refuse absent/unknown schemas and malformed required schema-3 fields.
- [x] Stamp both run templates schema 3 while preserving pointer/history
  separation and the retry budget/counter.
- [x] Update root `AGENTS.md` for blocker classes, cycles, retry limit 2, and
  the schema transition.
- [x] Mutation-pin cycles, schema transition/template stamps, required fields,
  and AGENTS without weakening a pre-existing assertion.
- [x] Keep all SKILL-038 fixture teardowns on
  `removeTreeWithRetrySync`; zero bare `rmSync(` calls.
- [x] Re-prove mandatory stop predicates: 1,877 bytes and SHA-256
  `03796a0e22ae67a371b1ddb58bbccdf4f08b3d5d9442eb47f59a27c6e9e19b38`.
- [x] Audit the final diff: exactly six declared files, no `packages/**`, no
  dependency change.
- [x] `npm run build:core`, `npm run verify:skills`, the 37-case mutation
  suite, and `git diff --check` pass.
- [x] One complete Windows `npm run verify` rail passes at exact commit
  `8010881c4e48ffabe97aba674361980f8ab3b279`.
- [x] Write the corrected post-implementation report.
- [x] Commit with `Kanmer: SKILL-038`.

## Review, merge, and verification

- [ ] Push with lease against remote head
  `8a909ee97d95a0c50e5102c3c7f88d4c575614ba`.
- [ ] Confirm fresh `verify` and `kanmer-gate` are required on the new head.
- [ ] Wait for every expected automated reviewer on the exact head.
- [ ] Obtain one fresh independent review and one delta review.
- [ ] Publicly disposition and resolve all four current threads.
- [ ] Sync the board and require exact-head `verify` plus `kanmer-gate` green.
- [ ] Merge PR #304 and verify the exact merge SHA.
- [ ] Write PASS proof, move through Verifying to Done, release the claim, and
  clean the workspace.
