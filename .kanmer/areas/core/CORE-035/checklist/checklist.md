# Checklist — CORE-035

## Preconditions and isolation

- [x] Confirm CORE-033, MCP-023, SKILL-021, and CORE-025 are Done with merged/reachable SHAs and PASS proof.
- [x] Confirm all consumed 0.4.0 dependencies (verify rail/workflow, phase-1 gate, identity/errors, records, Windows fix, governing docs) are merged.
- [x] Run `npm run verify` on the exact Kanmer source SHA to be tested and record zero exit.
- [ ] Confirm authenticated GitHub permissions for private repo creation, rules/protection, Actions inspection, and deletion.
- [x] Generate/record run ID, fixture repo name/path, production source SHA, operator alias, environment, and UTC start.
- [x] Create secret-free `scratch/integration-run.md` and chronological log structure.
- [x] Seed the disposable repo from the exact Kanmer source SHA, not an unrelated minimal project.
- [x] Remove production remote association before creating/pushing the disposable private remote.
- [x] Confirm disposable remote URL/visibility/default branch and copied production workflow/gate files.
- [x] Create a fresh disposable `kanmer-board` branch/worktree; confirm it is clean and separate.
- [x] Start/connect the Kanmer MCP server under test to disposable roots.
- [x] Confirm disposable fingerprint/roots/health and prove they differ from production.

## Fixture tickets

- [ ] Create INT-001 spike with research deliverable.
- [ ] Create INT-002 feature initially missing preparation docs and containing one unchecked question.
- [ ] Create INT-003 fully prepared and taken by a distinct actor with `.worktrees/int-003`.
- [ ] Create INT-004 fully prepared happy-path ticket with exact tiny two-file disposable diff.
- [x] Add one deliberate blocking dependency for INT-004 and an approved normal resolution path.
- [x] Record item timestamps, gate reports, document versions, links, and project fingerprint.
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
- [x] Sniff compatibility and use disposable `expected_project` only when advertised.
- [ ] Create/validate INT-004 branch and `.worktrees/int-004`; never alias board worktree.
- [x] Take INT-004 with exact actor/branch/worktree metadata.
- [x] Add only `scripts/spine-fixture.mjs` and `scripts/spine-fixture.test.mjs` in the disposable repo.
- [ ] Prove the test is reached by root `test:scripts`/`npm test`/`npm run verify`.
- [x] Run focused test, script tests, and full verify; retain every attempt.
- [ ] Complete versioned checklist/report and name production caller.
- [x] Commit exact two-file diff, prove full SHA reachable, push, and open PR initially without resolvable ticket footer.

## Merge-gate/protection matrix

- [ ] Record real Windows `verify` job/check/run/head and green result.
- [x] Observe and retain `NO_TICKET` failure.
- [ ] Add exact `Kanmer: INT-004` footer and rerun normally.
- [x] Observe `WRONG_STAGE` at actual shipped severity, then return ticket normally to Review.
- [x] Observe `DEPENDENCY_BLOCKED`, then resolve the deliberate blocker through approved workflow.
- [x] Add an unchecked question and observe the phase-1 question failure.
- [x] Resolve/check the question without deleting it and prove the failure clears.
- [x] Observe `NO_REVIEW_RECORD` at actual shipped severity.
- [x] Create/induce stale-head review and observe `STALE_REVIEW` at actual severity.
- [x] Record a safe fixture unreachable commit and observe `COMMITS_UNREACHABLE` at actual severity.
- [x] Remove the unreachable fixture record and retain the real reachable implementation SHA.
- [x] Write current-head review attestation with exact plan version/ticket timestamp and all findings dispositioned.
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


## Observed evidence — run 20260822t075446z-78e5ba65

- Source under test: `c8ea0b778895b0a76d9e32152a1f58c7b3b3d77b`; disposable private remote: `collisionengineers/kanmer-spine-integration-20260822t075446z-78e5ba65`; board branch commits reached `0f59f4e3); implementation PR #1 head `94f859b51329f85830d34285ce7fb56bb80f870b); explicit no-ticket PR #2.
- Exact-source `npm run verify`: PASS — build, core 283/283, GUI 375/375, HTTP 68/68, scripts 83/83, all-workspace typecheck, smoke 224/224, headless, mcpb, protocol 46/46, discovery 13/13, skills, AGENTS block, and plugin sync.
- Disposable fixture focused test: PASS 2/2. Disposable typecheck: PASS. Disposable `mcpb:check`: INCONCLUSIVE/FAIL because the temporary worktree did not expose `@anthropic-ai/mcpb/dist/cli/cli.js`; exact error retained in scratch. Disposable root `test:scripts`: 84/85, one environment-specific release-notes assertion resolves the disposable remote instead of canonical `collisionengineers/kanmer`; exact failure retained in scratch.
- Hosted run `32561444965` / gate job `97003509121`: WRONG_STAGE error (preparing→review) and NO_REVIEW_RECORD warning. Hosted run `32561602861` / gate job `97003919089`: NO_TICKET error, exit 1.
- Hosted run `32561623106` / gate job `97003970442`: WRONG_STAGE error (implementing→review). Hosted runs `32561715790`, `32561734355`, `32561757685`, and `32561789133` retained warning-only gate outputs; timing meant dependency/open-question transitions were also reproduced deterministically with local `check-pr`.
- Local disposable gate: DEPENDENCY_BLOCKED error for live INT-005; OPEN_QUESTIONS error for one unchecked question; final local gate PASS with all checks and reachable fixture commit. NO_REVIEW_RECORD, STALE_REVIEW, and COMMITS_UNREACHABLE warning paths were captured hosted/local.
- Private branch protection: both main and kanmer-board protection PUTs refused with exact GitHub 403 (“Upgrade to GitHub Pro or make this repository public…”). Protected conversation blocking, protected merge, exact merge SHA, detached verification, proof-on-merged-main, and cleanup are not claimed.

## Stop condition

Protected-merge/exact-SHA verification is INCONCLUSIVE at the private-repository capability boundary. Leave the disposable PR open for independent review; do not merge, bypass, fabricate green verify, or move CORE-035 to Done.
