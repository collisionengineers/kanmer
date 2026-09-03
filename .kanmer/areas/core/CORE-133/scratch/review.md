---
kind: review-attestation
pr: "316"
head_sha: "3a8341de6aa4c17226f00bc6a2ad9cb71d66dbe5"
verdict: pass
reviewer: "core133-consolidated-reviewer"
independent: true
plan_hash: "f8170a38e306f706"
ticket_updated: "2026-09-03T23:38:16.486Z"
board_sha: "a3110e6bc77b91a834646024616698cd6ea5a09b"
expected_reviewers:
  - "core133-consolidated-reviewer"
threads_snapshot: []
findings:
  - id: F-001
    severity: note
    summary: "apply_reconciliation's tool description and AGENTS.md gotcha 21 describe ROUTE_VERIFICATION_FAILURE without the new current-merge-SHA precondition"
    disposition: accepted-risk
    reason: "files/files.md places AGENTS/skills prose outside this ticket and makes index.ts conditional on the description assertion failing, which it does not; the behaviour is strictly more conservative than the prose, so no agent is led into an unsafe action"
  - id: F-002
    severity: note
    summary: "The new pure test for a FAIL proof with no merged_sha exercises a shape proofEvidence can never emit (it classifies such a record invalid, not fail)"
    disposition: accepted-risk
    reason: "the classifier is a pure total function over the evidence type, so pinning an unpopulated field is defensive coverage, and the stale-SHA branch it guards is genuinely reachable — unlike the dead missing+matches-claim arm this ticket removed"
  - id: F-003
    severity: note
    summary: "The predicate is narrower than its predecessor for clean/dirty + not-applicable, and gained a hasClaim conjunct beyond the plan's wording"
    disposition: accepted-risk
    reason: "not-applicable is emitted only with not-recorded so neither pair is producible by workspaceEvidence, and leaseState returns expired only when taken_at is set, which forces ticket.taken true, so hasClaim can never be false for an expired claim; both narrowings are pinned by the matrix test"
---
# Independent consolidated review — CORE-133

Round 0. Reviewed PR #316 at exact head `3a8341de6aa4c17226f00bc6a2ad9cb71d66dbe5`
(base `main` at `db5da255`) against plan version `f8170a38e306f706`, ticket
update `2026-09-03T23:38:16.486Z`, and pushed board
`5c1bff4d6e8b025eee02de38a61f43940a627d9e`. I did not implement this ticket.

Gathered: the ticket body and every packet document (research, files, plan,
checklist, post-implementation report, `scratch/execution.md`), FRD-028,
AGENTS.md §0/§6 merge gate/§7/§8 gotchas 8, 17 and 21, the full PR diff
(including the regenerated bundle), the PR view, checks, reviews, comments and
the GraphQL review-thread surface.

## What the change is

One commit, five files, no store, collector, tool-schema or type change:

- `packages/core/src/reconciliation.ts` — the expired-claim recovery gate
  becomes one named predicate `recoverableWorkspace`, admitting exactly
  `clean`/`dirty` + `matches-claim`, `missing` + `unavailable` and
  `not-recorded` + `not-applicable`; and `proofNamesCurrentMerge` is hoisted
  above both Verifying routes so a FAIL proof classed `implementation` or
  `plan` is refused with `PROOF_MERGE_SHA_MISMATCH` before it can route.
- `packages/core/src/reconciliation.test.ts` (77 tests),
  `packages/mcp-server/src/reconciliation.test.mjs` (collector + apply
  end-to-end), `packages/mcp-server/src/smoke.mjs` (tool-description pin).
- `plugins/kanmer/mcp/kanmer-mcp.cjs` — regenerated.

## Acceptance checks

Each plan acceptance check verified against the diff and by execution.

**Collector-shape exactness.** `workspaceEvidence`
(`packages/mcp-server/src/reconciliation.ts:261-301`) can emit exactly:
`not-recorded`+`not-applicable` (no recorded worktree);
`unavailable`+`unavailable`+`boardWorktree` (the board);
`missing`+`unavailable` (ENOENT stat);
`unavailable`+`unavailable` (non-ENOENT stat or a failed `git status`); and
`clean|dirty` × `{matches-claim, foreign-repository, branch-mismatch,
detached, unavailable}`. The new predicate admits precisely the recoverable
subset of that set and nothing more; every `unavailable` *state* is already
refused upstream by `EVIDENCE_INCONCLUSIVE`, and the board worktree by
`BOARD_WORKTREE_PROTECTED`. `transferTicket` (`store.ts:3536-3552`) refuses
only board, `foreign-repository` and `branch-mismatch`, so both newly admitted
shapes reach an authority the store already grants — no widening.

**The guard cannot block a legitimate PASS.** `proofNamesCurrentMerge` is the
extraction of the pre-existing expression `evidence.proof.mergedSha ===
evidence.pullRequest.mergeSha`; the PASS branch is byte-equivalent to its
predecessor. On the FAIL side, `VERIFYING_WITHOUT_MERGE_SHA`
(`reconciliation.ts:196-199`) already returns before this point when
`pullRequest.mergeSha` is absent, and `proofEvidence`
(`packages/mcp-server/src/reconciliation.ts:125-146`) classifies any proof
without a non-empty `merged_sha` as `invalid` rather than `fail`. A real FAIL
proof therefore always names a merge SHA, and the guard fires only for the
genuine stale case the ticket describes.

**Gotcha 21.** `ReconciliationAction` in `types.ts` is byte-identical to base
and still exactly six members; `store.ts` (including the `never` default in the
`applyReconciliation` dispatcher) is byte-identical to base; the
`failure_class` switch — its four cases, target stages and finding messages —
is unchanged, with the merge-SHA binding added as a precondition above it
rather than as an edit to the table. `transient` and `inconclusive` are
deliberately left outside the binding and are covered by a test.

**Gotcha 17.** No lease verb, lock section or transfer authority is touched:
`packages/core/src/store.ts` does not appear in the diff and diffs clean
against `db5da255`.

**Gotcha 8.** The bundle was regenerated. Its diff against base contains
exactly the two source hunks and nothing else — no tool added, removed or
renamed, roster stays 41 — which is the strongest available evidence short of
a local rebuild that the committed artefact matches its source.

**Failing-first.** Verified by experiment, not by assertion: in a disposable
detached worktree at the head I restored `packages/core/src/reconciliation.ts`
to its `db5da255` content and re-ran the focused suite. 12 tests fail and 65
pass — covering every new branch: the six matrix pairs whose verdict the
predicate changes (`clean`/`dirty` + `not-applicable`, all three `missing`
identities, `not-recorded` + `not-applicable`), both end-to-end recovery
tests, and all four FAIL merge-SHA tests. Restoring the file returns the suite
to 77/77.

**No weakened assertion.** Two existing assertions were edited. The MCP dry-run
test moved from `assert.equal(expired.recommendation, null)` to a `deepEqual`
of the full recommendation plus two new assertions (`claimIdentity`,
`claim_controller`) — strictly stronger. The pure ordering test gained
`mergedSha: sha("a")` on its two routing fixtures, which preserves that test's
original intent (that the routes fire and in what order) under the new
precondition; the refusal it now depends on is asserted separately. The
`expireClaim` extraction moved a comment into the helper's docstring verbatim
and changed no assertion.

**FRD-028.** AC3's "abandoned claims route to their correct stages" is what
this closes: the Behaviour section's "a missing worktree or no surviving work"
had no reachable route. AC4 is preserved — recovery is `transferTicket`, which
deletes nothing; the end-to-end tests assert branch, worktree, `taken_at` and
the surviving dirty tree are untouched and that nothing is created at the
recorded path. AC5 is intact: board, foreign and branch-mismatch refusals are
re-asserted at both layers.

## Commands

| Command | cwd | Exit | Result |
|---|---|---|---|
| `npx vitest run src/reconciliation.test.ts` | `.worktrees/core-133-review/packages/core` (detached at the head) | 0 | 77 passed |
| the same, with `reconciliation.ts` reverted to `db5da255` | as above | 1 | 12 failed / 65 passed (failing-first proof) |

The rail is the hosted `verify` on this exact head; no local `verify`, build,
`test:http` or smoke was run, by instruction.

## CI

Run `33818445522` on head `3a8341de6aa4c17226f00bc6a2ad9cb71d66dbe5`:

| Job | Id | Conclusion |
|---|---|---|
| `verify` (required) | 100855587529 | success |
| `kanmer-gate` (required, `KANMER_GATE_STRICT=true`) | 100855587393 | failure, superseded |
| `regate` | 100855588626 | skipped |

`verify` is the authoritative rail and covers `test:http` (the MCP
`reconciliation.test.mjs` suite), the smoke, the protocol check and
`plugin:check`, which sha256s the committed bundle against a fresh build — so
the regenerated `kanmer-mcp.cjs` is proved current by the rail, not by
assertion.

That `kanmer-gate` result is not a verdict about this review: it ran against
board tip `e2ed08b801d4d7b49b37a27c8e9903db71514dfb` (23:32Z), pushed before
the ticket entered Review at 23:38:16Z, and failed on exactly
`WRONG_STAGE` ("implementing") and `NO_REVIEW_RECORD`. Both are answered by
the board this attestation is written onto. It is re-run by dispatching
`pr.yml` on `main` after this record is pushed, and the merge waits for that
fresh green.

## Findings

Three notes, no blocker, major or minor. All dispositioned; none blocks.

- **F-001 — prose does not mention the new FAIL precondition.**
  `apply_reconciliation`'s tool description (`index.ts:1024`) and AGENTS.md
  gotcha 21 both describe `ROUTE_VERIFICATION_FAILURE` as routing on
  `failure_class` alone. The routing table itself is unchanged and both
  statements remain true of the table; what they omit is the merge-SHA
  precondition now above it. Accepted as residual risk: `files/files.md` puts
  "AGENTS/skills/manual conventions" explicitly outside this ticket and makes
  `index.ts` conditional on the description assertion failing (it passes), and
  AGENTS.md's managed block is reconciled by `kanmer-setup`, not by a ticket
  branch. The next ticket that touches either surface should fold it in.

- **F-002 — one new test asserts a shape the collector cannot emit.**
  "refuses a … FAIL proof that names no merge SHA at all" exercises
  `{ state: "fail", failureClass }` with no `mergedSha`, which `proofEvidence`
  never produces (it returns `invalid`). Accepted as residual risk: the
  classifier is a pure total function over the evidence type, so pinning its
  behaviour on an unpopulated field is legitimate defensive coverage, and the
  adjacent stale-SHA case in the same block is genuinely reachable. It is not
  the dead-arm pattern this ticket was filed to remove, because the arm it
  guards is reachable.

- **F-003 — the predicate is narrower than its predecessor in two
  collector-unreachable pairs, plus a redundant `hasClaim` conjunct.**
  `clean`/`dirty` + `not-applicable` previously recovered and now does not, and
  the recovery gate gained `hasClaim` beyond the plan's wording. Verified
  harmless: `not-applicable` is emitted only with `not-recorded`, so neither
  pair is producible; and `leaseState` returns `expired` only when `taken_at`
  is set, which forces `ticket.taken` true, so `hasClaim` cannot be false for
  an expired claim. The conjunct also makes the recovery gate agree with the
  `WORKSPACE_MISSING` / `CLAIM_WITHOUT_RECORDED_WORKSPACE` findings, which are
  already `hasClaim`-gated. Accepted as residual risk; both narrowings are
  pinned by the matrix test.

## Threads

The GraphQL review-thread surface returns an empty set for this head: no
review, no comment, no `chatgpt-codex-connector` thread. `threads_snapshot` is
therefore truthfully empty.

## Residual risk

F-001 leaves two prose surfaces describing a precondition-free FAIL route; the
behaviour is strictly more conservative than the prose, so an agent following
the prose is never led into an unsafe action, only into an unexplained
`RECONCILIATION_INCONCLUSIVE`. F-002 and F-003 are unreachable-input notes with
no production consequence.
