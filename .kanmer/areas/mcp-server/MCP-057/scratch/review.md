---
kind: review-attestation
pr: "325"
head_sha: "6b7049c735792ad01485dbe74f840733827c1c87"
verdict: needs-changes
reviewer: "independent-reviewer-mcp-057"
independent: true
plan_hash: "5e03efd45aa922cb"
ticket_updated: "2026-09-05T03:12:17.751Z"
board_sha: "a28b2c1fa0f900698725e66c94c385dae858d8ce"
expected_reviewers:
  - "independent-reviewer-mcp-057"
threads_snapshot: []
findings:
  - id: "F-001"
    severity: major
    summary: "The skill's \"What is validated by code\" section, FRD-006 and the post-implementation report all state that a receipt is accepted only when its job is named `verify` and that assessReceipt enforces event/job/conclusion mechanically. assessReceipt only checks that `job` is a non-empty string, never that it equals \"verify\"; and no production code path calls assessReceipt at all, so at runtime the only mechanical receipt check today is the head_sha comparison in reconciliation.ts. The section whose whole purpose is to draw the code/human line draws it in the wrong place."
    disposition: open
  - id: "F-002"
    severity: minor
    summary: "assessReceipt's run_id check is presence-only (`!== undefined && !== null && !== \"\"`), so run_id: 0, run_id: false and an arbitrary string all pass; `attempt`, `provider`, `repo` and `workflow` are not validated at all even though the skill's satisfied rule requires `workflow == pr.yml`."
    disposition: deferred-to-ticket
    ticket: "CORE-129"
  - id: "F-003"
    severity: note
    summary: "The case-sensitivity of head_sha and conclusion is deliberate and load-bearing, but no test pins it: there is no case for an uppercase 40-hex head_sha, an abbreviated 7-char SHA, or conclusion: \"SUCCESS\". A future \"tolerant\" normalisation could be added without any test failing."
    disposition: accepted-risk
    reason: "The behaviour is correct as written and documented in the module header; head_sha \"not-a-sha\" covers the non-40-hex branch generically and the reasons are asserted by exact string. The gap is regression protection, not a defect, and it is cheap to close alongside F-001."
  - id: "F-004"
    severity: note
    summary: "The receipt guard on the FAIL route is gated on failureClass implementation|plan (correctly mirroring CORE-133), but only the `implementation` half has a test; the `plan` half and the transient/inconclusive pass-through are covered only by inspection."
    disposition: accepted-risk
    reason: "Both halves are the same single boolean expression evaluated in one `if`, so the untested branch cannot diverge from the tested one; CORE-133's own PROOF_MERGE_SHA_MISMATCH tests have the same shape and the same coverage."
  - id: "F-005"
    severity: note
    summary: "apps/gui/src/renderer/src/manual/chapters.generated.ts is in the diff although the ticket's files/files.md does not list it and the lane C shared-file owner is apps/gui/src/**."
    disposition: accepted-risk
    reason: "Verified generated, not hand-edited: after `npm run build && npm run plugin:build` in the ticket worktree `git status --short` is empty, `npm run verify:docs` reports \"generated manual current\" and `npm run check:manual` reports up to date (22 chapters). The single-line change is the mechanical consequence of the docs/manual/proof.md edit that verify:docs requires. Disclosed as a deviation in the post-implementation report."
  - id: "F-006"
    severity: note
    summary: "CI at the reviewed head: kanmer-gate is red and `verify` was still in progress when this record was written; the PR is also BEHIND main after PR #321 (DOC-028) merged at bd36854967b0fa0b68489a4f3db592a59d451696."
    disposition: accepted-risk
    reason: "kanmer-gate's only failing check is NO_REVIEW_RECORD (\"no scratch/review.md review attestation was recorded\"); its other eight checks pass, including WRONG_TARGET, DEPENDENCY_BLOCKED and COMMITS_UNREACHABLE, and it reads boardSha a28b2c1f. It is the expected pre-review state and resolves once this attestation is on the pushed board. The head must move anyway to fix F-001 and to update with main, so a fresh attestation bound to the new head is required regardless; a green required `verify` is a precondition of that record, not of this one."
---

# Review — MCP-057 (round 0, consolidated)

Independent review of PR #325 at head `6b7049c735792ad01485dbe74f840733827c1c87`
(branch `MCP-057-evidence-first-verify`, base `main` at `c088be13`). I did not
implement this ticket. Verdict: **needs-changes**, on one open major finding
(F-001). Everything else in the change is sound and I found no other defect
worth returning it for.

## What the change is

Thirteen files. The shape matches `files/files.md` exactly, plus the generated
manual chapter (F-005):

| Action | Path |
|---|---|
| Add | `packages/core/src/proof-receipts.ts` |
| Add | `packages/core/src/proof-receipts.test.ts` |
| Modify | `packages/core/src/index.ts`, `types.ts`, `reconciliation.ts`, `reconciliation.test.ts` |
| Modify | `packages/mcp-server/src/reconciliation.ts`, `reconciliation.test.mjs` |
| Modify | `plugins/kanmer/skills/kanmer-verify/SKILL.md` |
| Modify | `docs/manual/proof.md`, `docs/functional/frd/FRD-006-typed-proof.md` |
| Modify | `plugins/kanmer/mcp/kanmer-mcp.cjs` (rebuilt bundle) |
| Modify | `apps/gui/src/renderer/src/manual/chapters.generated.ts` (generated) |

Nothing touches `scripts/verify.mjs`, `scripts/agents-block-body.mjs`,
`.github/workflows/pr.yml`, the verify-rail scripts, or any hand-written GUI
source. `package.json`/`package-lock.json` are not in the diff, so no
dependency was added.

## Commands run by the reviewer

Read-only, in the ticket's own worktree `.worktrees/MCP-057` at
`6b7049c7`. The full `npm run verify` was deliberately not run — the hosted
rail owns it.

| Command | Exit | Result |
|---|---|---|
| `npm run test -w @kanmer/core` | 0 | 894/894, 25 files; `proof-receipts.test.ts` 15 tests |
| `node packages/core/scripts/check-browser.mjs` | 0 | clean |
| `node --test packages/mcp-server/src/reconciliation.test.mjs packages/mcp-server/src/step-reconciliation.test.mjs` | 0 | tests 100, pass 99, skipped 1 (platform), fail 0 |
| `npm run verify:skills` | 0 | ALL CHECKS PASSED (21 checks) |
| `npm run verify:docs` | 0 | PASS — generated manual current |
| `npm run check:manual` | 0 | up to date, 22 chapters |
| `npm run build && npm run plugin:build` then `git status --short` | 0 | **empty** — the committed bundle byte-matches a fresh build |
| `npm run plugin:check` | 0 | 41 tools match, bundle bytes match, 12 skill frontmatters parse, isolated handshake lists 41 tools |

## Acceptance, item by item

- **`proof-receipts.ts` is pure.** No `node:` import, no IO, no `fs`. Not in
  `browser.ts` (grep confirms), and `check-browser.mjs` passes. **Met.**
- **`parseProofReceipts` is tolerant.** Absent `receipts` → `[]`; a null,
  string or array frontmatter → `[]`; unknown fields survive via
  `{ ...record }` and are asserted by the `future_field` test. A non-array
  `receipts`, a non-object entry and an entry without a non-empty `kind` are
  reported in `invalid` rather than dropped. **Met.**
- **`assessReceipt` rejects the bad cases.** Wrong SHA, non-`push` event,
  non-`success` conclusion, missing `run_id`/`url`/`job`, unknown `kind`, and
  a `head_sha` that is not full 40-hex, each with its own distinct reason
  string; every one has a test. I tried to break it: an uppercase 40-hex SHA
  is rejected (regex is `/^[0-9a-f]{40}$/`, no `i` flag) with the "must be a
  full 40-hex" reason rather than the mismatch reason, which is the right
  outcome for the wrong-sounding reason; a 7-char SHA is rejected; `conclusion:
  "SUCCESS"` is rejected; `event: "pull_request"` is rejected; `run_id` as a
  string passes and as `0`/`false` also passes (F-002). **Met except for the
  `verify` job-name claim — see F-001.**
- **Core reconciliation adds a distinct finding on both routes without
  changing CORE-133.** `receiptNamesOtherMerge()` is a new helper; both call
  sites are placed *after* the existing `proofNamesCurrentMerge` guards, in
  the PASS route and in the FAIL route under the same
  `implementation|plan` gate CORE-133 uses. No existing branch, message or
  finding code is altered. The code is `PROOF_RECEIPT_SHA_MISMATCH`, distinct
  from `PROOF_MERGE_SHA_MISMATCH`. A proof with no `receipts` short-circuits on
  `!Array.isArray || length === 0` and reaches exactly today's behaviour; the
  back-compat case is asserted twice (core: "moves merged PASS verification to
  done" unchanged plus a new matching-receipt positive; mcp-server:
  `assert.deepEqual(proofEvidence(proof()), { state: "pass", mergedSha })`).
  **Met.**
- **`proofEvidence()` shape is unchanged for existing callers.** `receipts` is
  spread in only when the parsed list is a non-empty array; `{ invalid }` and
  `[]` both omit the key, so the returned object is `deepEqual` to the old one.
  A malformed `receipts` block never fails the base PASS/FAIL/mergedSha
  reading, which is the right call and is documented at the call site.
  **Met.**
- **`ReconciliationEvidence` change is additive and optional.**
  `receipts?: ProofReceipt[]` under `proof`, `import type` only. **Met.**
- **Skill step order.** 1 read/reconcile → 2 `gh pr view` MERGED → 3 look up
  the bound receipt *before any Git operation* → 4 classify obligations → 5
  worktree only if something is missing → 6 run only the missing checks → 7
  proof + Done gate. The satisfied rule is the correct one (push event,
  `pr.yml`, `verify` job completed + success, `headSha` string-equal to the
  full merge SHA); PR-head and synthetic-merge runs are explicitly rejected as
  never interchangeable; an in-progress run is waited on once with
  `gh run watch --exit-status` with an explicit "do not poll, do not start a
  competing local rail". Manual GUI / installed-host / Windows-lock / provider
  checks stay `missing` regardless of the receipt. The `receipts:` YAML example
  uses exactly the field names `parseProofReceipts` reads
  (`kind, provider, repo, workflow, event, run_id, attempt, head_sha, job,
  conclusion, url, covers, observed_by`) — I diffed them against the interface
  field by field. The code-validated vs human-judged section is present.
  **Met except for that section's content — F-001.**
- **Docs.** `docs/manual/proof.md` and FRD-006 describe receipts as additive
  beside `attempts[]`, name the acceptance rule, say no existing proof is
  rewritten, and both point forward to CORE-129's typed `attempts[]` record
  without claiming it exists. They are consistent with CORE-129's Verification
  item 4 ("a `receipts[]` list from MCP-057 is validated by the same
  parser… a proof without `receipts` is unaffected"), which this shape
  satisfies. Neither doc claims automated provenance; both defer it. FRD-006
  does repeat the `job: verify` acceptance rule — which is the *intended*
  contract and is why F-001 is a code fix, not a docs-only fix. **Met.**
- **Bundle, roster, dependencies.** Rebuilt bundle byte-matches; 41 tools; no
  new dependency. **Met.**

## F-001 in detail

`plugins/kanmer/skills/kanmer-verify/SKILL.md` §"What is validated by code and
what is human judgement in this release" says:

> Code validates: receipt shape (`kind`, `job`, `run_id`, `url` present),
> `head_sha` exactly matching the PR's merge SHA, `event == push`, **the job
> named `verify`**, and `conclusion == success`. `assessReceipt` and the
> reconciliation classifier's `PROOF_RECEIPT_SHA_MISMATCH` finding enforce
> these mechanically.

Two things are untrue of the code as written:

1. `assessReceipt` checks `nonEmptyString(receipt.job)` and nothing more. A
   receipt carrying `job: "kanmer-gate"` — or any other non-empty string — on a
   successful push run at the right SHA assesses `satisfied`. FRD-006 and the
   post-implementation report make the same `job` is `verify` claim, and the
   ticket's own acceptance says a "missing `verify` job … is rejected by
   `assessReceipt`". The test named "rejects a receipt missing the verify job"
   passes `job: undefined`, so it does not catch this either.
2. `assessReceipt` has **no production caller**: grep across `packages/` finds
   it only in its own test and in the two documents. `proofEvidence()` calls
   `parseProofReceipts` only, and the classifier compares `head_sha` alone. So
   `event`, `conclusion`, `job` and `kind` are enforced by nothing that runs
   today; they are a library available to a verifier and to CORE-129.

The consequence is the one this ticket exists to prevent: a verifier who
trusts that section can record a receipt that the hosted `verify` job never
produced, and no mechanical check contradicts it. This is one root-cause class
— *documented mechanical enforcement that the code does not perform* — and it
takes one remedy, not two patches:

- add the `verify` job-name check (and, if you want the skill's satisfied rule
  fully mirrored, `workflow`) to `assessReceipt` with a table case for a
  wrong-named job; **and**
- reword that section (and the FRD/report sentence, and the mis-named test) so
  it states precisely what runs today: `PROOF_RECEIPT_SHA_MISMATCH` in
  `reconcileEvidence` is the enforced runtime check; `assessReceipt` is the
  verifier-side and CORE-129-facing assessor.

That is the whole blocking change list. I would take F-003's uppercase /
abbreviated-SHA / `"SUCCESS"` cases in the same pass, since the edit is in the
same table.

## Scope, plan and report fidelity

The diff is exactly the plan's five ordered steps and nothing else. The
"Do not modify" list is honoured: no receipt store, no reuse key, no ancestry
reuse, no new MCP tool, no process spawning in core, nothing in
`agents-block-body.mjs`/`kanmer-setup` (PR #321) or the verify-rail scripts
(PR #322), and `step-reconciliation.ts` is untouched. The three declared
deviations are accurate. Every exit code the report claims, I reproduced.

## Threads

No review threads, review comments or reviews exist on this PR at
`6b7049c735792ad01485dbe74f840733827c1c87` — confirmed via the GitHub GraphQL
`reviewThreads` surface (0 nodes) and `comments`/`reviews` (0 each).
`threads_snapshot` is therefore an empty list, which is the truthful value. No
`chatgpt-codex-connector` thread was posted; the bot is never a gate and its
absence blocks nothing.

## CI at this head (run 33941205872)

| Job | Id | State |
|---|---|---|
| `kanmer-gate` | 101238895114 | failure — `NO_REVIEW_RECORD` only (see F-006) |
| `verify` | 101238895288 | in_progress at the time of writing |
| `regate` | 101238895643 | skipped |

## Residual risk

F-002 (loose `run_id`/`attempt`/`workflow` typing) is deliberately handed to
CORE-129, which already owns typed validation of `receipts[]` and is
sequenced immediately after this ticket. F-003–F-006 are recorded for the
trail. The substantive residual risk once F-001 is fixed is the one the change
names itself: "packet ⊆ npm run verify" remains a human judgement, so a
verifier who marks an obligation satisfied that the `verify` job does not
actually run produces a truthful-looking proof for work nobody did. That is
correctly disclosed rather than hidden, and it is the right boundary for this
release.
