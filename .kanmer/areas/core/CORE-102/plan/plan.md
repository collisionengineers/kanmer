# Plan — CORE-102: Stabilize the area-based ticket-ID test under the release verification rail

## Approach

Refactor the reported `store.test.ts` case so it tests **ticket creation** against the fresh board's already-declared `pr-review` area (`PR` prefix), rather than first mutating the board through `addColumn`. It will still create a real area ticket and an unassigned ticket, and assert their area-born IDs and exact on-disk folders: `PR-001 → areas/pr-review/PR-001/PR-001.md` and `TICK-001 → areas/_none/TICK-001/TICK-001.md`. That preserves the ticket-creation claim while removing the unrelated cold `addColumn → withExclusiveFileLock → powershell.exe` identity operation from this case.

`addColumn` remains a distinct board-mutation behaviour: retain its existing store-level coverage and make its successful area registration independently explicit in the existing custom-area/filter test if the minimal diff can do so. Do not pre-warm the identity cache, mock the lock path, move time into hooks, change a test/hook timeout, add retries, or modify `io.ts`. The observed cold Windows identity spawn is an evidence-backed inference for the historical timeout, not authority to weaken lock/PID-reuse safety. If the separated `addColumn` coverage itself fails its existing bound in validation, stop and report that distinct lock-path defect rather than masking it in this ticket.

## Governing docs

- **Meets — `docs/functional/frd/FRD-015-ticket-and-board-core.md` R1:** the regression continues to use a real store and asserts the ticket Markdown path under its declared area plus the fallback `_none` area; it does not substitute an in-memory fixture.
- **Meets — FRD-015 R2:** the regression continues to prove area-born prefix allocation (`PR-001`) and unassigned fallback allocation (`TICK-001`). Existing custom-area mutation coverage remains separate so the plan does not conflate a board-config write with ID creation.
- **Meets — FRD-015 R5:** the test continues to exercise real exclusive item creation and on-disk persistence. No atomic-write, lock-recovery, concurrency, or bounded retry semantics are changed.
- **Meets — FRD-015 acceptance evidence:** focused core evidence, the full core suite, and the ordinary clean-checkout `npm run verify` rail will record the result. No FRD or ADR change is needed: this preserves the shipped storage contract and narrows only test responsibility.

## Steps

1. In a dedicated CORE-102 worktree, inspect the exact current `store.test.ts` target and the existing custom-area/filter test before editing. Confirm that `pr-review` remains the fresh-board area with prefix `PR`; if that contract has changed, stop for replanning rather than substituting a different fixture.
2. Refactor only the target area-ID/folder test to create a ticket in `pr-review` and then an unassigned ticket. Rename its wording if needed to state the area-prefix/folder claim accurately. Keep the two ID assertions and the two exact `fs.access` path assertions; replace only the now-unnecessary `addColumn` setup and its `API` literals.
3. Keep `addColumn` independently covered as a board-mutation operation in the existing custom-area/filter test. Make the post-`addColumn` board-area registration observable there if that can be done in the same minimal test-file diff; retain its real store call and do not mock/pre-warm it. Do not touch `io.ts`, `store.ts`, `ids.ts`, package scripts, workflows, or test timeout/retry configuration.
4. Inspect the diff against this boundary: expected source surface is `packages/core/src/store.test.ts` only. Record any need to change production lock identity, test runner policy, workflow, or release material as out of scope and stop for a separately governed decision.
5. Run focused checks separately for the refactored ticket-creation case and the independent custom-area/`addColumn` case using the normal core package script, leaving its existing finite bounds in force. Preserve every exit code and named-test result.
6. Run the complete core package suite, core typecheck, core build, and `git diff --check`. Then run the repository's ordinary `npm run verify` from a fresh normal GitHub-origin clone at the implementation head, not a linked worktree. Do not rerun, alter, or repair v0.3.7's historical tag workflow.
7. Commit the bounded source-test diff, push, and open a normal PR with the `Kanmer: CORE-102` footer. Record the post-implementation report with the retained v0.3.7 failure, focused/full/authoritative exits, exact head, and the distinction between the observed timeout and inferred cold identity-spawn cause. Move only to Review for independent review; do not merge, publish, tag, write proof, or update CORE-101's outcome.

## Verification

From the dedicated ticket worktree, run the following with the core package script's existing `--no-file-parallelism` and unchanged timeout behaviour:

1. Focused target: `npm run test -w @kanmer/core -- --reporter=verbose -t "gives tickets area-based ids and places them in the area's folder"`. Record the ID/path assertions and exit code.
2. Focused mutation separation: `npm run test -w @kanmer/core -- --reporter=verbose -t "creates with an area and filters by it"`. Record that real `addColumn` coverage and its exit code.
3. Full core: `npm run test -w @kanmer/core`.
4. Static/build: `npm run typecheck -w @kanmer/core`, `npm run build -w @kanmer/core`, and `git diff --check`.
5. Authoritative normal checkout: from a fresh GitHub-origin clone at the exact PR head, `npm ci --ignore-scripts` then `npm run verify`. The PR's hosted verification must be terminal passing before independent review may approve it.

A non-zero result, a timeout in either separated case, a changed ID/path assertion, or a required production-lock change is a stop condition. Report it; do not raise bounds, retry, pre-warm, or change release state.

## Risks / open questions

- **Risk: fixture responsibility is blurred again.** Mitigation: the ticket-creation case uses the shipped area and has only ID/path assertions; the custom-area test makes `addColumn` coverage explicit.
- **Risk: moving the reported test reveals a separate cold lock-path failure.** Mitigation: retain a real independently checkable `addColumn` case and stop on its failure; do not relabel it as an ID-allocation pass.
- **Risk: a production lock optimization looks tempting.** Mitigation: `io.ts` and its PID-reuse semantics are out of scope under the parked research question. A future change needs its own concurrency design and test proof.
- **Parked evidence limit:** the historical hosted run has no per-await trace. The plan relies on documented measured call-path evidence without claiming conclusive attribution.
