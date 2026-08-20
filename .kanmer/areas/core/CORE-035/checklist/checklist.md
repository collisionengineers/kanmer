# Checklist — CORE-035

## Preconditions and isolation

- [ ] Confirm CORE-033, MCP-023, SKILL-021, and CORE-025 are Done with merged/reachable SHAs and PASS proof.
- [ ] Confirm all consumed 0.4.0 dependencies (verify rail/workflow, phase-1 gate, identity/errors, records, Windows fix, governing docs) are merged.
- [ ] Run `npm run verify` on the exact Kanmer source SHA to be tested and record zero exit.
- [ ] Confirm authenticated GitHub permissions for private repo creation, rules/protection, Actions inspection, and deletion.
- [ ] Generate/record run ID, fixture repo name/path, production source SHA, operator alias, environment, and UTC start.
- [ ] Create secret-free `scratch/integration-run.md` and chronological log structure.
- [ ] Seed the disposable repo from the exact Kanmer source SHA, not an unrelated minimal project.
- [ ] Remove production remote association before creating/pushing the disposable private remote.
- [ ] Confirm disposable remote URL/visibility/default branch and copied production workflow/gate files.
- [ ] Create a fresh disposable `kanmer-board` branch/worktree; confirm it is clean and separate.
- [ ] Start/connect the Kanmer MCP server under test to disposable roots.
- [ ] Confirm disposable fingerprint/roots/health and prove they differ from production.

## Fixture tickets

- [ ] Create INT-001 spike with research deliverable.
- [ ] Create INT-002 feature initially missing preparation docs and containing one unchecked question.
- [ ] Create INT-003 fully prepared and taken by a distinct actor with `.worktrees/int-003`.
- [ ] Create INT-004 fully prepared happy-path ticket with exact tiny two-file disposable diff.
- [ ] Add one deliberate blocking dependency for INT-004 and an approved normal resolution path.
- [ ] Record item timestamps, gate reports, document versions, links, and project fingerprint.
- [ ] Snapshot board files/hashes before packet reads.

## Packet/refusal matrix

- [ ] INT-001 returns spike refusal before gate evaluation and creates no implementation state.
- [ ] INT-002 first returns missing non-question preparation requirements.
- [ ] Add only the required INT-002 preparation docs while leaving the question unresolved.
- [ ] INT-002 then returns dedicated `questions-resolved` refusal.
- [ ] INT-003 returns other-actor occupancy refusal with `missing:[]`.
- [ ] INT-003 returns ready/continues for the owning actor.
- [ ] INT-004 ready packet contains identity, ticket/group/docs/versions/extras/full gates/stop/commands.
- [ ] Compare snapshots and prove all packet calls are read-only.

## Happy-path execution

- [ ] Follow the shipped execute skill; packet is the first ticket-specific call.
- [ ] Sniff compatibility and use disposable `expected_project` only when advertised.
- [ ] Create/validate INT-004 branch and `.worktrees/int-004`; never alias board worktree.
- [ ] Take INT-004 with exact actor/branch/worktree metadata.
- [ ] Add only `scripts/spine-fixture.mjs` and `scripts/spine-fixture.test.mjs` in the disposable repo.
- [ ] Prove the test is reached by root `test:scripts`/`npm test`/`npm run verify`.
- [ ] Run focused test, script tests, and full verify; retain every attempt.
- [ ] Complete versioned checklist/report and name production caller.
- [ ] Commit exact two-file diff, prove full SHA reachable, push, and open PR initially without resolvable ticket footer.

## Merge-gate/protection matrix

- [ ] Record real Windows `verify` job/check/run/head and green result.
- [ ] Observe and retain `NO_TICKET` failure.
- [ ] Add exact `Kanmer: INT-004` footer and rerun normally.
- [ ] Observe `WRONG_STAGE` at actual shipped severity, then return ticket normally to Review.
- [ ] Observe `DEPENDENCY_BLOCKED`, then resolve the deliberate blocker through approved workflow.
- [ ] Add an unchecked question and observe the phase-1 question failure.
- [ ] Resolve/check the question without deleting it and prove the failure clears.
- [ ] Observe `NO_REVIEW_RECORD` at actual shipped severity.
- [ ] Create/induce stale-head review and observe `STALE_REVIEW` at actual severity.
- [ ] Record a safe fixture unreachable commit and observe `COMMITS_UNREACHABLE` at actual severity.
- [ ] Remove the unreachable fixture record and retain the real reachable implementation SHA.
- [ ] Write current-head review attestation with exact plan version/ticket timestamp and all findings dispositioned.
- [ ] Requery head/checks/threads immediately before merge; rerun review on any change.
- [ ] Create an unresolved GitHub conversation and prove protection blocks merge.
- [ ] Resolve it normally and prove that blocker clears.
- [ ] Confirm all required checks are green on the same current reviewed head.
- [ ] Merge through protected PR with no admin bypass, force, rule edit, or check removal.
- [ ] Record PR URL, final check rollup, protection state, and full merge SHA.
- [ ] Move INT-004 exactly to Verifying after successful merge.

## Exact-SHA verification

- [ ] Fetch objects without pulling/resetting/checking out mutable main.
- [ ] Create detached verification worktree at the exact merge SHA.
- [ ] Assert exact HEAD, detached state, clean tree, unchanged main checkout, and healthy board branch.
- [ ] Run fixture test, script tests, and full `npm run verify` from detached worktree.
- [ ] Retain every failed/inconclusive/pass attempt with exact cwd/environment/exit/output.
- [ ] On any non-PASS, write truthful proof, leave Verifying, file remediation, and stop.
- [ ] On PASS, whole-file write/read back INT-004 proof with exact merge SHA and all attempts.
- [ ] Move INT-004 to Done only after PASS proof and verify final gate/item state.
- [ ] Remove clean implementation/verification worktrees and report any cleanup failure.

## CORE-035 proof and cleanup

- [ ] Write `proof/compiled-workflow-integration.md` with identity, fixture, packet matrix, every gate code/severity, merge protection, exact-SHA verification, final ticket state, and cleanup.
- [ ] Include a complete observed/not-observed matrix and distinguish warnings from failures.
- [ ] Write/read back CORE-035 canonical proof record with truthful PASS/FAIL/INCONCLUSIVE result.
- [ ] Scan both proof files for secrets/tokens/credentials before finalization.
- [ ] Confirm protection/rules were never weakened.
- [ ] Delete the disposable private GitHub repository and record not-found verification.
- [ ] Remove the entire local fixture tree and record path absence.
- [ ] Confirm no global Git config/credentials, production remote/rules/board/source, or unrelated files changed.
- [ ] Re-read CORE-035 gates; move Done only on complete PASS proof and resolved questions.
- [ ] On any missing observation or cleanup failure, leave Verifying with non-PASS proof and file exact remediation.
- [ ] Stop; do not create a reusable harness or begin another ticket.

## Progress notes

Append run IDs, source/fingerprint identities, all packet/check/gate outputs, PR/head/merge SHAs, exact commands/exits, proof versions, cleanup results, and deviations in chronological order.
