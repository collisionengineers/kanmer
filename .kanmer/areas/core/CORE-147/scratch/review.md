---
kind: review-attestation
pr: "330"
head_sha: "7d9ed857dc6c96bae35f30e70c3052b753e71279"
verdict: pass
reviewer: "independent-reviewer-core-147"
independent: true
plan_hash: "f887dca5542aaf80"
ticket_updated: "2026-09-05T15:33:47.350Z"
board_sha: "09a37644d97b038bad1105508a65387a5e8d8352"
expected_reviewers:
  - "independent-reviewer-core-147"
threads_snapshot: []
findings:
  - id: "F-001"
    severity: minor
    summary: "receiptAssessmentRejections still separates the SHA class by string-sniffing the reason text (!reason.includes(\"head_sha\")), so a receipt whose head_sha is not a 40-hex string at all — e.g. head_sha: 123 — produces only the \"must be a full 40-hex Git object id\" reason, which is filtered out, while receiptNamesOtherMerge requires typeof string and so does not fire either. I drove it end to end: reconcileEvidence with that receipt on a merged PASS returns MOVE_TO_DONE with no PROOF_RECEIPT_* finding."
    disposition: accepted-risk
    reason: "Pre-existing and unchanged by this PR — MCP-057 review F-007, whose per-receipt loop filtered the identical substring, and receiptNamesOtherMerge is byte-identical to main. CORE-147 in fact narrows the class rather than widening it: under a multi-job contract the same malformed receipt now leaves its job uncovered and fires the new incomplete reason. The residual case is a proof that is already a truthful PASS on its attempts and merely carries a malformed additive receipt, so the outcome is a correct Done reached without a warning, never a false Done. A structured reason code is the right eventual shape and is out of this ticket's packet."
  - id: "F-002"
    severity: note
    summary: "assessReceiptSet's documented \"an empty list is satisfied — that is the fallback\" branch is shadowed on the reconciliation path: receiptAssessmentRejections returns [] on `!Array.isArray(receipts) || receipts.length === 0` before assessReceiptSet is ever called. So the mcp-server fallback test cannot kill a mutation in that branch."
    disposition: accepted-risk
    reason: "Mutation-proved rather than argued, against the built core in an out-of-tree copy: (A) assessReceiptSet's empty branch flipped to `rejected` alone — the fallback still yields MOVE_TO_DONE, so the mcp fallback test would still pass; (B) A plus the length-0 early return removed — the fallback breaks (recommendation null, PROOF_RECEIPT_REJECTED), which is the shape the fallback test does detect; (C) the early return removed alone — the fallback survives on assessReceiptSet's own branch. The two guards are deliberately redundant and either alone suffices, which is the safe direction. The branch is not unpinned: proof-receipts.test.ts's \"is satisfied by an empty list\" and golden GB-11's \"no receipts at all is satisfied\" both assert assessReceiptSet([]) directly, and mutation A turns both red. The end-to-end fallback test still proves what it claims — real YAML → CORE-129 parser (record.state valid-pass) → reconcileEvidence → zero PROOF_RECEIPT_* findings and a recommendation deepEqual to the receipt-bearing control."
  - id: "F-003"
    severity: note
    summary: "A receipt for a job the contract does not name rejects the whole set even when every contract job is separately covered: with contract jobs [\"build\",\"test\"] and receipts build+test+lint, assessReceiptSet returns rejected on the lint receipt's job reason. Verified live."
    disposition: accepted-risk
    reason: "Strict in the safe direction and consistent with the module's stated posture (\"reject it explicitly in the proof rather than silently falling back\"): the verifier writes the receipts, the skill now says \"write one receipt per contract job the run discharged\", and an extra receipt is a proof the verifier chose to write for a job the board never declared as evidence. The failure mode is a refusal the verifier can fix by declaring the job or dropping the receipt, never a false Done. Worth one sentence in the skill whenever it is next touched; not worth a return."
  - id: "F-004"
    severity: note
    summary: "packages/core/src/types.ts: the pre-existing DeliveryConfigSchema doc comment (\"Resolve it with resolveDelivery(board) rather than reading these fields…\") is now orphaned — VerificationContractSchema and its own doc block were inserted between it and DeliveryConfigSchema, so the comment documents the wrong symbol and DeliveryConfigSchema has none."
    disposition: accepted-risk
    reason: "Comment placement only; no type, schema or emitted output changes, and typecheck plus the browser boundary check are green. Both comments remain individually correct prose about the same delivery block."
  - id: "F-005"
    severity: note
    summary: "VerificationContractSchema does not de-duplicate `jobs`, so a board declaring jobs: [\"verify\", \"verify\"] resolves and is satisfied by one receipt (verified live), and a rejection reason would read `must be one of \"verify\", \"verify\"`."
    disposition: accepted-risk
    reason: "Cosmetic in the message and semantically correct in the outcome — coverage is computed with a Set and a filter, so a duplicate can neither require a second receipt nor mask a missing job. No behavioural risk."
  - id: "F-006"
    severity: note
    summary: "CI at this head (run 33975181029): required `verify` green (job 101331739078, 8m57s); `kanmer-gate` red (job 101331738540) with exactly one failing check, NO_REVIEW_RECORD, and STALE_REVIEW skipped for the same reason; SYNC_REQUIRED, WRONG_STAGE, WRONG_TARGET, OPEN_QUESTIONS, DEPENDENCY_BLOCKED, NO_TICKET and COMMITS_UNREACHABLE all pass with strict: true. `regate` skipped (PR event)."
    disposition: accepted-risk
    reason: "The gate's sole failure is self-referential and is discharged by this record. The gate reads the remote board tip and does not re-run on a board push, so it must be re-run after this board push and observed green before merging; that observation belongs to the merger and this record cannot assert it in advance."
  - id: "F-007"
    severity: note
    summary: "The live control plane answering this session is 0.4.1 packaged (sha256 3f7af329), so get_status.delivery does NOT yet report `verification`/`verificationSource` — the ticket's \"note delivery.verification now present\" is not observable until the new build is installed."
    disposition: accepted-risk
    reason: "Expected staleness, not a defect in the change: the new field is exercised through the worktree build instead — smoke.mjs 388/388 including the explicit get_status.delivery.verification/verificationSource check, and golden GB-11 reading a declared ci.yml contract back through get_status as board-sourced. This is the ordinary stale-control-plane condition, an operator install step rather than a code finding."
---

# Review — CORE-147 (round 0, consolidated)

Verdict: **pass**. No finding of any severity is open. I did not implement this
ticket. This is a pass on the change, not a merge authorisation — see F-006.

Reviewed at head `7d9ed857dc6c96bae35f30e70c3052b753e71279`, PR
[#330](https://github.com/collisionengineers/kanmer/pull/330), base
`origin/main` @ `410bfd22` (unmoved throughout this review), plan version
`f887dca5542aaf80`, ticket `updated` 2026-09-05T15:33:47.350Z, board
`09a37644` (local == remote, ahead 0 at gather).

One commit, 21 files, +915 / −131. `.github/workflows/**`, `scripts/verify.mjs`,
`scripts/agents-block-body.mjs`, `.kanmer/board.yml` and `defaultBoardConfig()`
are all absent from the diff, and `package.json`/`package-lock.json` are
untouched, so no dependency changed. The only `apps/gui/src/**` path in the diff
is the generated `manual/chapters.generated.ts`, whose delta is exactly the
rewritten `docs/manual/proof.md` receipts section.

## The outcome, judged directly

The external review's complaint was that `pr.yml` / `verify` / `push` shipped as
literals inside `@kanmer/core`, so evidence-first verification benefited only
Kanmer. I checked the portability claim against a real on-disk board rather than
against the tests:

- A `board.yml` carrying `delivery: { integrationBranch: dev, verification:
  { workflow: ci.yml, jobs: [build, test], event: push } }` resolves to exactly
  that, with `deliveryVerificationSource` = `board` and `integrationBranch` =
  `dev`.
- The same file with `verification: { jobs: [build] }` **throws at read**, naming
  `delivery.verification.workflow` as required and the `event` enum — the
  "all three keys together" claim holds on the read path, not only on the MCP
  write path.
- Against the **live** board copy, the new `resolveDelivery` returns
  `verification: { pr.yml, ["verify"], push }` with source `default`, and
  `deliveryPolicyVersion` still computes
  `5cfe348e489ff619f6be3667078b4a4e79925e27f0ea375c23b2845ab13c49e0` — byte-equal
  to the `main@1` attempt digest recorded in the release ledger. The digest
  claim is verified against the recorded value, not merely asserted stable.

## Trying to break the assessment

Run against the built core, not read off the source:

| Probe | Result |
|---|---|
| contract jobs `["verify","verify"]`, one receipt | satisfied (F-005) |
| receipt job `Verify` vs contract `verify` | rejected — `must be one of "verify", got "Verify"`; case-sensitivity is consistent with `head_sha`/`conclusion` |
| contract `event: pull_request`, PR-head receipt whose `head_sha` ≠ merge SHA | **rejected on the SHA**, and `receiptNamesOtherMerge` fires first in the classifier, so it surfaces as `PROOF_RECEIPT_SHA_MISMATCH`. A PR run can never stand in for a squash merge. |
| receipt for a job outside the contract alongside complete coverage | whole set rejected (F-003) |
| receipt with a non-string `head_sha` | rejected by `assessReceipt`, but filtered by the classifier (F-001) |
| one of two contract jobs covered | rejected, naming `missing "test" (contract jobs: "build", "test")` — the hole a per-receipt loop cannot see |

`run_id`/`attempt` positive-integer and `provider`/`repo` non-empty-when-present
close MCP-057 review F-002 exactly as CORE-129's F-003 required; the contract
itself closes MCP-057 F-010. Both deferrals are genuinely discharged, not
re-deferred.

## Reconciliation threading and back-compat

`ReconciliationEvidence.verification` is optional; `stableEvidence` copies it
only when present, and `stableEvidence` feeds no digest — it is a defensive copy
— so no recommendation identity shifts. Absent evidence falls back to
`DEFAULT_VERIFICATION_CONTRACT`, i.e. pre-CORE-147 behaviour, so an old
collector paired with a new classifier cannot start *accepting* receipts it used
to reject. The MCP collector fills it from `resolveDelivery(board)` at the host
boundary and a dedicated test drives that through a real store, default then
declared. Every existing MCP-057/CORE-129 row runs unchanged under the default
contract; the only altered assertion is the reason string that now reads
`must be one of "verify"`.

## The fallback test, and what it does and does not prove

It genuinely goes YAML → CORE-129 parser → `reconcileEvidence`: `proof(...,
null)` writes a literal `receipts: []` block, `proofEvidence` parses it,
`record.state === "valid-pass"` is asserted, zero `PROOF_RECEIPT_*` findings,
`MOVE_TO_DONE`, and `deepEqual` against a receipt-bearing control under the same
`ci.yml` contract. That is the acceptance criterion, met.

I mutation-tested it as directed, and the result is F-002: making
`assessReceiptSet` reject empty lists does **not** break the fallback test,
because `receiptAssessmentRejections` early-returns on a zero-length list first.
Removing that early return *as well* breaks it. The empty branch is still pinned
directly by the core unit test and by golden GB-11, so the property is covered —
the redundancy is belt-and-braces in the safe direction, and worth recording
rather than assuming.

## Prose

`kanmer-verify` step 3 builds the lookup from `delivery.verification`, requires
**every** contract job `completed`/`success`, states the PR-event rule correctly
(accepted only when the contract's event is `pull_request` *and* the run's head
SHA equals the merge SHA — never true for a squash merge), makes coverage
generic with Kanmer's `VERIFY_STEPS` mapping as the worked example, and gives the
fallback its own explicit, truthful paragraph including `receipts: []` and the
required body sentence. The one remaining `pr.yml` in the receipts example is
labelled as Kanmer's own default. `kanmer-setup` gains the "declare the
contract" section with the "not on pushes to the integration branch ⇒ always
fallback" warning stated plainly, and says Kanmer never renames another
repository's workflows. AGENTS.md §4, `docs/manual/proof.md`, FRD-006 and
FRD-031 (new AC6) all agree with the code. The managed AGENTS block body was
correctly left alone (`verify-agents-block.mjs` 35/35). Repository-wide, the
only surviving `pr.yml` literals in shipped code are the documented default and
its comments; no other skill hardcodes a workflow.

## Scoped checks re-run in `.worktrees/CORE-147` at this head

| Command | Exit | Result |
|---|---|---|
| `npm ci` | 0 | |
| `npm run build && npm run plugin:build && node scripts/build-stamp.mjs --write` | 0 | |
| `npm run test:built` | 0 | node suites 196/196 pass, fail 0; whole chain exit 0 |
| `npm run typecheck` | 0 | core, mcp-server, ui, gui (node + web) |
| `node packages/core/scripts/check-browser.mjs` | 0 | `proof-receipts` still absent from `browser.ts` |
| `node packages/mcp-server/src/smoke.mjs` | 0 | **388/388** |
| `npm run golden` | 0 | **20/20** scenarios, GB-11 extended in place |
| `node --test packages/mcp-server/src/reconciliation.test.mjs` | 0 | 55/55 |
| `npm run verify:skills` | 0 | ALL CHECKS PASSED |
| `npm run verify:docs` | 0 | PASS — generated manual current |
| `npm run check:manual` | 0 | up to date, 22 chapters |
| `node scripts/verify-agents-block.mjs` | 0 | 35/35 |
| `npm run plugin:check` | 0 | **41 tools**, bundle bytes match, 12 skill frontmatters |
| `git status --short` | — | **empty** after the final build and after the mutation copies were removed |

Mutation work was done on an out-of-tree copy of the built `index.js` under
`node_modules/`; no tracked file was modified at any point.

## Threads

GitHub GraphQL at this head: `reviewThreads` 0 nodes, `reviews` 0, `comments` 0.
`threads_snapshot: []` is the truthful value. No bot thread was posted; a bot is
never a gate.

## Portability — the question this ticket exists to answer

Yes, with one honest caveat. A repository whose integration branch is `dev` and
whose `ci.yml` runs on pull requests and pushes to `main` only declares
`delivery: { integrationBranch: dev, verification: { workflow: ci.yml, jobs:
[build, test], event: push } }`. `kanmer-verify` reads that from `get_status`,
runs `gh run list --workflow ci.yml --event push --commit <mergeSha>`, finds
nothing, classifies every obligation `missing`, runs them all in the detached
worktree at the merge SHA, and writes `receipts: []` with the reason.
Reconciliation returns `MOVE_TO_DONE` with no `PROOF_RECEIPT_*` finding — proven
by the end-to-end test, not asserted. If that project instead declares `event:
pull_request`, its PR-head receipts are rejected as `PROOF_RECEIPT_SHA_MISMATCH`
because the squash commit is not the PR head, so it also lands on the fallback
and can never obtain a false pass. Nothing about that project's workflows is
renamed. The caveat is F-007: the consuming project must be running a build that
reports `delivery.verification`; on an older server the field is simply absent
and the classifier falls back to Kanmer's default, which is the pre-CORE-147
behaviour.

## Residual risk

Coverage — "is this obligation actually inside what the contract's jobs run?" —
is still a human judgement, now correctly scoped per project and stated as such
in the skill rather than asserted as a Kanmer rule. Provider provenance remains
unautomated (R2-EVIDENCE). F-001's malformed-`head_sha` filter is the one
mechanism I would fix next, and it is MCP-057's F-007 class rather than
anything this PR introduced.

## Merge preconditions the merger still owns

1. Push this board and **re-run `kanmer-gate` at `7d9ed857`, observing it
   green** — the gate reads the remote board tip and does not re-run on a board
   push.
2. Confirm the head has not moved and `origin/main` is still `410bfd22`.
3. The ticket's `claim_expires_at` was 2026-09-05T16:01:15.154Z, so the
   Review → Verifying move may need the claim refreshed first.

I did not merge, did not move the ticket, and did not push the PR branch.
