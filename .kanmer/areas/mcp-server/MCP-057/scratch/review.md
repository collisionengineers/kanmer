---
kind: review-attestation
pr: "325"
head_sha: "24f226539f5b4ede4a0dbd941eb2d28232a667a7"
verdict: pass
reviewer: "independent-reviewer-mcp-057"
independent: true
plan_hash: "5e03efd45aa922cb"
ticket_updated: "2026-09-05T03:37:55.203Z"
board_sha: "152c430d7ad752180b49d62c4e85a578798e21bc"
expected_reviewers:
  - "independent-reviewer-mcp-057"
threads_snapshot: []
findings:
  - id: "F-001"
    severity: major
    summary: "Round 1: the skill's \"What is validated by code\" section, FRD-006 and the report claimed assessReceipt enforces job == \"verify\" and that these checks run mechanically, while assessReceipt only checked that `job` was a non-empty string and had no production caller at all."
    disposition: fixed
  - id: "F-002"
    severity: minor
    summary: "assessReceipt's run_id check is presence-only (`!== undefined && !== null && !== \"\"`), so run_id: 0, run_id: false and an arbitrary string all pass; `attempt`, `provider` and `repo` remain unvalidated. `workflow` is no longer in this class — round 2 added an exact `pr.yml` check."
    disposition: deferred-to-ticket
    ticket: "CORE-129"
  - id: "F-003"
    severity: note
    summary: "Round 1: the deliberate case-sensitivity of head_sha and conclusion was pinned by no test (uppercase 40-hex, 7-char abbreviation, conclusion: \"SUCCESS\")."
    disposition: fixed
  - id: "F-004"
    severity: note
    summary: "Both receipt guards on the FAIL route are gated on failureClass implementation|plan (correctly mirroring CORE-133), but only the `implementation` half is tested — for PROOF_RECEIPT_SHA_MISMATCH in round 1 and now for PROOF_RECEIPT_REJECTED too; the `plan` half and the transient/inconclusive pass-through are covered only by inspection."
    disposition: accepted-risk
    reason: "Each guard is one boolean expression in one `if` covering both classes, so the untested class cannot diverge from the tested one; CORE-133's own PROOF_MERGE_SHA_MISMATCH tests have exactly the same shape and coverage. I confirmed by mutation that the tested route really fails when the check is removed."
  - id: "F-005"
    severity: note
    summary: "apps/gui/src/renderer/src/manual/chapters.generated.ts is in the diff although the ticket's files/files.md does not list it and the lane C shared-file owner is apps/gui/src/**."
    disposition: accepted-risk
    reason: "Verified generated, not hand-edited: after `npm run build && npm run plugin:build` at 99f0cf70 `git status --short` is empty, `verify:docs` reports \"generated manual current\" and `check:manual` reports up to date (22 chapters). Its blob at this head is byte-identical to the one I checked (fc8e671b83f00f0198f84b589b09af088fc74a9e). Disclosed as a deviation in the post-implementation report."
  - id: "F-006"
    severity: note
    summary: "CI at the reviewed head 24f22653: required `verify` is green (7m37s, job 101244693975), and it exercised CORE-140's new build-once rail on this merged tree. `kanmer-gate` is red for STALE_REVIEW only — it read the round-2 attestation, bound to the superseded head 99f0cf70."
    disposition: accepted-risk
    reason: "The gate's sole failing check is self-referential and is discharged by this record. The gate reads the remote board tip and does not re-run on a board push, so it must be re-run after this board push and observed green before merging; that observation is the merger's, and this record cannot assert it in advance. Every other gate check passed at the previous head, and the recorded ticket commits 6b7049c7 and 99f0cf70 are both ancestors of 24f22653, so COMMITS_UNREACHABLE stays satisfied."
  - id: "F-007"
    severity: note
    summary: "receiptAssessmentRejections() separates the SHA class from the rest by string-sniffing the human-readable reason text (`!reason.includes(\"head_sha\")`), so rewording either assessReceipt reason silently changes which finding code fires."
    disposition: accepted-risk
    reason: "Contained and fail-safe: both current head_sha reasons contain the literal token, and if the filter ever leaked a SHA reason the outcome would still be an error finding plus `none()` — the same refusal under a different code, never a false Done. A structured reason code is the right eventual shape and belongs with CORE-129's typed receipt validation rather than here."
  - id: "F-008"
    severity: note
    summary: "The FAIL-route call passes `evidence.pullRequest.mergeSha ?? \"\"` although the VERIFYING_WITHOUT_MERGE_SHA guard earlier in the same block already guarantees a truthy mergeSha; the PASS route passes the narrowed value directly. Dead defensive code with an asymmetric shape."
    disposition: accepted-risk
    reason: "Unreachable today, and harmless if it ever became reachable: an empty mergedSha only affects head_sha reasons, which this helper discards anyway, so the non-SHA rejections it reports would still be correct. Not worth a further return."
  - id: "F-009"
    severity: note
    summary: "\"Either finding blocks MOVE_TO_DONE and the backward ROUTE_VERIFICATION_FAILURE routes\" means it blocks the reconciliation recommendation: reconcileEvidence is called only from packages/mcp-server/src/reconciliation.ts:471 (reconcile_ticket / apply_reconciliation). The store's own verifying → done transition does not consult it, so a human calling move_item directly is not stopped by a rejected receipt."
    disposition: accepted-risk
    reason: "This is exactly the status CORE-133's PROOF_MERGE_SHA_MISMATCH already has, so the new findings are consistent with the established meaning of a reconciliation finding rather than overclaiming a new one. Making proof evidence a hard store-side Done gate is CORE-129's stated scope (\"enter-done requirement under strict board policy\"), not this ticket's."
  - id: "F-010"
    severity: note
    summary: "job === \"verify\" and workflow === \"pr.yml\" are literals inside @kanmer/core, which ships to consumer projects. kanmer-setup does not install pr.yml, so a consumer whose verification workflow or job is named anything else would have every receipt it writes rejected."
    disposition: deferred-to-ticket
    ticket: "CORE-129"
  - id: "F-011"
    severity: note
    summary: "plan/plan.md still describes assessReceipt's reasons as \"missing job/run_id/url\" and was not re-versioned for the round-1 contract (job/workflow exact match, PROOF_RECEIPT_REJECTED); the plan now understates the implementation."
    disposition: accepted-risk
    reason: "The tightening was directed by this review on the same PR through the skill's remediation lane, which does not require a plan rewrite, and it is recorded in full in the post-implementation report's \"Review round 1 remediation\" section and in this attestation. plan_hash is unchanged at 5e03efd45aa922cb, so the binding is honest about which plan version was reviewed."
---

# Review — MCP-057 (round 1 delta, re-bound to the updated head)

This replaces the round-1 attestation bound to `99f0cf70689c8cfa804823f5c0b0636fa7ca0a4d`
with the identical review re-bound to head
`24f226539f5b4ede4a0dbd941eb2d28232a667a7`. Verdict, findings and dispositions
are unchanged, because the reviewed content is unchanged. `review_round` stays
1; this is not a new remediation round and consumes no budget — the head moved
only because `gh pr update-branch` merged `main` forward.

## Why the re-bind is content-free

`24f22653` is a two-parent merge commit: parents are
`99f0cf70689c8cfa804823f5c0b0636fa7ca0a4d` (the head I reviewed) and
`37b83b1435602dddeaea3da32668b4846d1be963` (`main`). Three independent checks,
all run against the fetched objects rather than taken on trust:

1. **Path-filtered diff.** `git diff 99f0cf70 24f22653` over all eleven
   ticket-owned paths plus the rebuilt bundle and the generated manual chapter:
   **empty**.
2. **Blob identity.** `git rev-parse <sha>:<path>` for each of those thirteen
   paths is identical at both commits — `proof-receipts.ts`
   `96cab88a93f7bf1c70c38a50ae6d678ba1a86106`, `reconciliation.ts` (core)
   `95147f86daa753488a7e1b9afdf7924c7a41d75f`, `reconciliation.ts` (mcp-server)
   `5d39b17b0de48069720fa2ae467fe685c4a89bad`, `kanmer-verify/SKILL.md`
   `1eb07ff148d5241b4ced0bf918de97e7969c5c01`, `kanmer-mcp.cjs`
   `9f5f1ded88b9784b902a5edc025a03d50a349543`, and the other eight likewise.
   Not "no diff" by rendering — the same objects.
3. **Nothing leaked in the other direction.** `git diff --stat 37b83b14 24f22653`
   is exactly this ticket's thirteen files, 773 insertions / 22 deletions. The
   merge neither added anything of `main`'s to the ticket's side nor reverted
   anything of `main`'s.

What `main` brought in — CORE-140 at `941650317be4cad4f6a86c6ab16362ee5dd8dfdb`
(`scripts/verify.mjs`, `scripts/run-tests.mjs`, `scripts/build-stamp.mjs`,
`scripts/release.mjs`, `scripts/verify-steps.test.mjs`,
`packages/mcp-server/scripts/run-http-tests.mjs`, root and mcp-server
`package.json`, `.github/workflows/pr.yml`) and DOC-026 at
`37b83b1435602dddeaea3da32668b4846d1be963` (`AGENTS.md`, `CLOSEOUT_PLAN.md`) —
is eleven files, **none** of them this ticket's. I checked the one interaction
worth checking: CORE-140's `package.json` edits are script-only, `package-lock.json`
is untouched, so no dependency changed and no installed tree is invalidated.
The combination itself is exercised by the hosted rail below.

## CI at this head (run 33943293808)

| Job | Id | State |
|---|---|---|
| `verify` | 101244693975 | **pass** (7m37s) — the whole rail on the merged tree, under CORE-140's new build-once logic |
| `kanmer-gate` | 101244693775 | failure — `STALE_REVIEW` only, discharged by this record (F-006) |
| `regate` | 101244694387 | skipped (PR event) |

## Threads re-gathered at this head

GitHub GraphQL `reviewThreads` 0 nodes, `comments` 0, `reviews` 0 at
`24f226539f5b4ede4a0dbd941eb2d28232a667a7`. `threads_snapshot: []` remains the
truthful value. No bot thread was posted; a bot is never a gate.

---

The full round-1 review — the eight-file remediation of F-001, the mutation
test that killed the neutralised `job`/`workflow` checks in four tests, the
end-to-end `PROOF_RECEIPT_REJECTED` verification on both routes, the
back-compat argument, and every scoped command with its exit code — is recorded
below unchanged. It applies verbatim to this head because the content is the
same objects.

# Review — MCP-057 (round 1, delta)

Delta review of PR #325, scoped to the lines changed since the previously
attested head `6b7049c735792ad01485dbe74f840733827c1c87`, their callers and
contracts, and the relevant tests — plus a rerun of every scoped check. The
sanctioned return is audited in `scratch/execution.md` at
2026-09-05T03:26:08.290Z. I did not implement this ticket.

Verdict: **pass**. F-001 is fixed at the mechanism, not papered over; no
finding of any severity is open.

## What moved since 6b7049c7

Two commits:

- `b33278f6` — `git merge origin/main`. **It changes nothing in this ticket's
  files.** Path-filtered diff of `6b7049c7..b33278f6` over all eleven
  ticket-owned paths plus the bundle: **empty**. The merge brings 23 files —
  DOC-028 (`bd368549`) and GUI-152 (`32aa54fc`) — both already on `main`. No
  conflict, no ticket-file drift.
- `99f0cf70` — the remediation: 8 files, 241 insertions, 22 deletions.

## Each remediation claim, verified in code

**1. `assessReceipt` now checks `job === "verify"` and `workflow === "pr.yml"`.**
Confirmed in `packages/core/src/proof-receipts.ts`. `job` uses an `else if`
after the presence check, so a missing job still reports
`receipt is missing job` and a wrong job reports
`receipt job must be "verify", got "kanmer-gate"` — two distinct reasons, not
one merged one. `workflow` is an unconditional `!== "pr.yml"` check, so an
absent `workflow` is rejected too (`got undefined`). Both reason strings are
asserted verbatim by tests. The module header documents why, and names
`kanmer-gate` as the concrete hazard — the job that runs on the same push and
can be green while `verify` fails.

**Mutation test.** I took a copy of `proof-receipts.ts`, neutralised both new
checks (`else if (false)` and `if (false)`), and ran
`vitest run src/proof-receipts.test.ts src/reconciliation.test.ts`: **4 tests
failed** — the two `assessReceipt` unit cases *and* both `reconcileEvidence`
route cases, the latter failing on `expect(result.recommendation).toBeNull()`
with a live `ROUTE_VERIFICATION_FAILURE`/`MOVE_TO_DONE`. The original file was
restored and `git status --short` is empty. The checks are load-bearing and the
tests really kill the mutant.

**2. `receiptAssessmentRejections()` wires `assessReceipt` into the classifier.**
Confirmed in `packages/core/src/reconciliation.ts`: it calls `assessReceipt`
on every receipt and collects every rejection reason that does not mention
`head_sha`, returning `[]` for a proof with no receipts. It is called on the
PASS route and, under the same `implementation || plan` gate CORE-133 uses, on
the FAIL route — in both cases **after** the existing
`receiptNamesOtherMerge` / `PROOF_RECEIPT_SHA_MISMATCH` guard, which is
byte-identical to round 1 (finding code, level and message all unchanged). So
a receipt with both a wrong SHA and a wrong job reports the SHA finding only,
which is the right precedence and is documented in the helper's comment.

**3. `PROOF_RECEIPT_REJECTED` really fires end to end, on both routes.**
Verified twice over. In core, the two new table rows
(`packages/core/src/reconciliation.test.ts`) drive `reconcileEvidence` with a
full `validReceipt(sha("a"), { job: "kanmer-gate" })` on the PASS and
FAIL/implementation routes and assert `recommendation === null` with
`findings[0].code === "PROOF_RECEIPT_REJECTED"`. In mcp-server, the new test
goes through the real decoder: `proofEvidence(proof(..., "kanmer-gate"))`
parses YAML frontmatter, and both routes assert the finding **and** that its
message contains `receipt job must be "verify"`. That is a genuine end-to-end
path — YAML → `parseProofReceipts` → evidence → `assessReceipt` → finding —
not a hand-built evidence object.

**4. Back-compat is unchanged and still asserted.** `receiptAssessmentRejections`
short-circuits on `!Array.isArray(receipts) || receipts.length === 0` before
touching `assessReceipt`, so a proof with no receipts takes exactly the round-0
path. The assertions that pin it are untouched:
`assert.deepEqual(proofEvidence(proof()), { state: "pass", mergedSha })`, the
FAIL equivalent, the empty-`receipts:` case, and the unmodified core row
"moves merged PASS verification to done". `proofEvidence()` itself is
byte-identical this round — every new check lives in core's classifier.

One deliberate consequence worth naming: the round-1 core fixture
`{ kind, head_sha }` would now be *rejected*, so it was replaced with a full
`validReceipt()` helper. A partial receipt therefore blocks Done rather than
being ignored. That is the intended stricter posture ("reject it explicitly in
the proof rather than silently falling back"), it can only affect proofs that
carry a `receipts:` block, and no such proof exists yet.

**5. Skill and FRD-006 reworded to what runs.** The "What is validated by code"
section now lists `kind`/`job`/`workflow`/`run_id`/`url`, exact `head_sha`,
`event`, `conclusion`, says `assessReceipt` "is the single function that checks
every one of these" and that it runs through `reconcileEvidence`, and names
both finding codes. The `receipts:` example paragraph makes the same
distinction. FRD-006 adds the module path, the `workflow` and case-sensitivity
rules, and "This is enforced at verification time, not merely documented",
naming `packages/core/src/reconciliation.ts`. I re-read both against the code:
every claim now holds. `docs/manual/proof.md` was correctly left alone — its
prose named no enforcing function. The two human-judged items (provider
provenance, "packet ⊆ npm run verify") are unchanged and still honest.

**6. Case-sensitivity cases added (F-003).** Uppercase 40-hex `head_sha`,
7-character abbreviation, and `conclusion: "SUCCESS"`, each asserting the exact
reason; the uppercase case even comments *which* reason it pins and why. The
mis-named round-0 test is now "rejects a receipt missing the job entirely",
beside a real "rejects a receipt whose job is not verify".

**7. Bundle.** Rebuilt and committed; byte-matches a fresh build (below).

## Scoped checks rerun at 99f0cf70 — the same objects as this head

In `.worktrees/MCP-057`, read-only apart from the restored mutation copy. Full
`npm run verify` deliberately not run locally — the hosted rail owns it and is
green at `24f22653`.

| Command | Exit | Result |
|---|---|---|
| `npm run test -w @kanmer/core` | 0 | **901/901**, 25 files (894 → 901: +5 receipt cases, +2 reconciliation rows) |
| `node packages/core/scripts/check-browser.mjs` | 0 | clean; `proof-receipts` still absent from `browser.ts` |
| `npm run typecheck` | 0 | core, mcp-server, ui, gui |
| `node --test packages/mcp-server/src/reconciliation.test.mjs packages/mcp-server/src/step-reconciliation.test.mjs` | 0 | tests 101, pass 100, skipped 1 (platform), fail 0 |
| `npm run verify:skills` | 0 | ALL CHECKS PASSED |
| `npm run verify:docs` | 0 | PASS — generated manual current |
| `npm run check:manual` | 0 | up to date, 22 chapters |
| `npm run build && npm run plugin:build` then `git status --short` | 0 | **empty** — committed bundle byte-matches a fresh build |
| `npm run plugin:check` | 0 | 41 tools match, bundle bytes match, 12 skill frontmatters parse, isolated handshake lists 41 tools |
| mutation: both new checks neutralised, then restored | — | 4 tests failed; worktree clean afterwards |

## Scope

Exactly the ticket's files, in both rounds. No new path, no dependency
(`package.json`/`package-lock.json` absent from the ticket's diff), and
`scripts/verify.mjs`, `.github/workflows/pr.yml`, `agents-block-body.mjs`, the
verify-rail scripts, `AGENTS.md` and `step-reconciliation.ts` are untouched by
this ticket — the DOC-028, GUI-152, CORE-140 and DOC-026 files present in the
branch arrived only through the two `main` merges and are byte-identical to
`main`.

## Residual risk

F-002 and F-010 are handed to CORE-129, which already owns typed validation of
`receipts[]`; F-010 in particular — this repository's workflow and job names
baked into `@kanmer/core` — should become board configuration before any
consumer project writes a receipt. F-007, F-008, F-009 and F-011 are recorded
notes. The unchanged substantive residual risk is the one the change names
itself and now states accurately: "packet ⊆ npm run verify" is a human
judgement, so a verifier who marks an obligation satisfied that the `verify`
job does not actually run still produces a truthful-looking proof for work
nobody did. Provider provenance is likewise unautomated. Both are disclosed
rather than hidden, which is the right boundary for this release.

## Merge preconditions the merger still owns

This is a `pass` on the change, not a merge authorisation. Before merging:
re-run `kanmer-gate` at `24f22653` **after** this board push and observe it
green, and confirm the head has not moved again. I did not merge and did not
move the ticket.
