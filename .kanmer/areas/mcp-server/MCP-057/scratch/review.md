---
kind: review-attestation
pr: "325"
head_sha: "99f0cf70689c8cfa804823f5c0b0636fa7ca0a4d"
verdict: pass
reviewer: "independent-reviewer-mcp-057"
independent: true
plan_hash: "5e03efd45aa922cb"
ticket_updated: "2026-09-05T03:37:55.203Z"
board_sha: "3f498c164591e695f853c763b8eb0ee5a72e38d2"
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
    reason: "Verified generated, not hand-edited: after `npm run build && npm run plugin:build` at 99f0cf70 `git status --short` is empty, `verify:docs` reports \"generated manual current\" and `check:manual` reports up to date (22 chapters). Round 2 did not re-edit docs/manual/proof.md, so the file is unchanged since round 1. Disclosed as a deviation in the post-implementation report."
  - id: "F-006"
    severity: note
    summary: "CI at the reviewed head: required `verify` is green (9m40s, job 101242176572), but `kanmer-gate` is red for STALE_REVIEW — it read the round-1 attestation, which is bound to the superseded head 6b7049c7."
    disposition: accepted-risk
    reason: "The gate's sole failing check is self-referential and is discharged by this record: it fails with \"review attestation head 6b7049c7… does not match PR head 99f0cf70…\" and every other check passes. The gate reads the remote board and does not re-run on a board push, so a green kanmer-gate observed at the final merged-forward head remains a merge precondition owned by the merger, not something this record can assert. The PR is also BEHIND main again after CORE-140 merged at 941650317be4cad4f6a86c6ab16362ee5dd8dfdb; the coordinator will update-branch and request one delta re-bind."
  - id: "F-007"
    severity: note
    summary: "receiptAssessmentRejections() separates the SHA class from the rest by string-sniffing the human-readable reason text (`!reason.includes(\"head_sha\")`), so rewording either assessReceipt reason silently changes which finding code fires."
    disposition: accepted-risk
    reason: "Contained and fail-safe: both current head_sha reasons contain the literal token, and if the filter ever leaked a SHA reason the outcome would still be an error finding plus `none()` — the same refusal under a different code, never a false Done. A structured reason code is the right eventual shape and belongs with CORE-129's typed receipt validation rather than here."
  - id: "F-008"
    severity: note
    summary: "The FAIL-route call passes `evidence.pullRequest.mergeSha ?? \"\"` although the VERIFYING_WITHOUT_MERGE_SHA guard earlier in the same block already guarantees a truthy mergeSha; the PASS route passes the narrowed value directly. Dead defensive code with an asymmetric shape."
    disposition: accepted-risk
    reason: "Unreachable today, and harmless if it ever became reachable: an empty mergedSha only affects head_sha reasons, which this helper discards anyway, so the non-SHA rejections it reports would still be correct. Not worth a round-3 return."
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

# Review — MCP-057 (round 1, delta)

Delta review of PR #325 at head `99f0cf70689c8cfa804823f5c0b0636fa7ca0a4d`,
scoped to the lines changed since the previously attested head
`6b7049c735792ad01485dbe74f840733827c1c87`, their callers and contracts, and
the relevant tests — plus a rerun of every scoped check. `review_round` is 1;
the sanctioned return is audited in `scratch/execution.md` at
2026-09-05T03:26:08.290Z. I did not implement this ticket.

Verdict: **pass**. F-001 is fixed at the mechanism, not papered over; no
finding of any severity is open.

## What moved since 6b7049c7

Two commits:

- `b33278f6` — `git merge origin/main`. **It changes nothing in this ticket's
  files.** I ran a path-filtered diff of `6b7049c7..b33278f6` over all eleven
  ticket-owned paths plus the bundle: **empty**. The merge brings 23 files —
  DOC-028 (`bd368549`: AGENTS.md, both `agents-block-body.mjs` copies,
  `kanmer-setup/SKILL.md`, `verify-agents-block.mjs`,
  `agents-block-routing.test.mjs`) and GUI-152 (`32aa54fc`: `apps/gui/**`,
  FRD-036) — both already on `main`. No conflict, no ticket-file drift.
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

## Scoped checks rerun at 99f0cf70

In `.worktrees/MCP-057`, read-only apart from the restored mutation copy. Full
`npm run verify` deliberately not run — the hosted rail owns it and it is green
at this head.

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

Still exactly the ticket's files. Round 2 touched no new path, added no
dependency (`package.json`/`package-lock.json` absent from the diff), and left
`scripts/verify.mjs`, `.github/workflows/pr.yml`, `agents-block-body.mjs`, the
verify-rail scripts and `step-reconciliation.ts` untouched — the DOC-028 and
CORE-140 files that appear in the branch arrived only through the `origin/main`
merge and are byte-identical to `main`.

## Threads

No review threads, review comments or reviews exist on PR #325 at
`99f0cf70689c8cfa804823f5c0b0636fa7ca0a4d` — GitHub GraphQL `reviewThreads`
0 nodes, `comments` 0, `reviews` 0. `threads_snapshot: []` is the truthful
value. No `chatgpt-codex-connector` thread was posted; the bot is never a gate.

## CI at this head (run 33942377774)

| Job | Id | State |
|---|---|---|
| `verify` | 101242176572 | **pass** (9m40s) |
| `kanmer-gate` | 101242176470 | failure — `STALE_REVIEW` only, discharged by this record (F-006) |
| `regate` | 101242176885 | skipped (PR event) |

The previous run 33941205872 at `6b7049c7` is now marked cancelled overall
because the new push superseded it; its `verify` job had passed (7m41s) before
that.

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
bring the branch up to date (`main` moved again — CORE-140 at
`941650317be4cad4f6a86c6ab16362ee5dd8dfdb`), obtain one delta re-bind of this
attestation to the new head, and observe `kanmer-gate` **green** at that head
against a pushed board. I did not merge and did not move the ticket.
