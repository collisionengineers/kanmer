## Summary

Reordered `kanmer-verify/SKILL.md`'s Workflow so the bound post-merge `pr.yml`
`verify` run for the exact PR merge SHA is looked up before any Git
operation, and its result (satisfied / rejected / in-progress) drives
whether a verification worktree is created at all. Added a pure,
additive-only `packages/core/src/proof-receipts.ts` (`ProofReceipt`,
`parseProofReceipts`, `assessReceipt`) that decodes and assesses a proof's
optional `receipts[]` list, and wired it through `proofEvidence()` in
`packages/mcp-server/src/reconciliation.ts` and the merge-SHA comparison in
`packages/core/src/reconciliation.ts` (a distinct `PROOF_RECEIPT_SHA_MISMATCH`
finding beside the existing CORE-133 `PROOF_MERGE_SHA_MISMATCH`, plus, after
review round 1, `PROOF_RECEIPT_REJECTED` for every other `assessReceipt`
rejection reason). Documented receipts in the proof and FRD-006 manuals as
additive alongside `attempts[]`, explicitly ahead of CORE-129's coming typed
`attempts[]` validator.

## Files changed and why

- `packages/core/src/proof-receipts.ts` (new) — pure `ProofReceipt` type,
  `parseProofReceipts` (tolerant: absent `receipts` key → `[]`; unknown
  fields preserved verbatim; malformed entries reported as `{ invalid }`),
  `assessReceipt` (distinct rejection reasons for wrong SHA, non-`push`
  event, non-`success` conclusion, missing `job`/`run_id`/`url`, unknown
  `kind`, and — after review round 1 — wrong `job` and wrong `workflow`). No
  IO, no `node:` imports.
- `packages/core/src/proof-receipts.test.ts` (new) — table-driven tests:
  absent/valid/invalid parsing, unknown-field preservation, every
  `assessReceipt` rejection reason plus the satisfied case, and (round 1)
  wrong-job, wrong-workflow, uppercase-SHA, abbreviated-SHA, and
  uppercase-conclusion cases.
- `packages/core/src/index.ts` — exports `proof-receipts.js`. Deliberately
  **not** added to `browser.ts` (matches the ticket's technical seam and
  `check-browser.mjs`, which passed unmodified).
- `packages/core/src/types.ts` — added optional
  `ReconciliationEvidence["proof"].receipts?: ProofReceipt[]`. Additive; every
  existing fixture that omits it is unaffected.
- `packages/core/src/reconciliation.ts` — `receiptNamesOtherMerge()` helper
  (unchanged from round 0) plus, after review round 1, a new
  `receiptAssessmentRejections()` helper that calls `assessReceipt` on every
  receipt and collects every non-`head_sha` rejection reason. Both the PASS
  route and the `implementation`/`plan` FAIL routes now check
  `receiptNamesOtherMerge` first (unchanged `PROOF_RECEIPT_SHA_MISMATCH`
  finding, unchanged message) and then `receiptAssessmentRejections`
  (new `PROOF_RECEIPT_REJECTED` finding naming every reason) before falling
  through to today's behaviour. A proof with no `receipts` never triggers
  either path.
- `packages/core/src/reconciliation.test.ts` — added cases to the existing
  table-driven suites: a receipt-mismatch case each for the PASS and
  FAIL/implementation routes, a positive case confirming a matching receipt
  does not block `MOVE_TO_DONE`, and (round 1) a wrong-job rejection case
  each for the PASS and FAIL/implementation routes plus a `validReceipt()`
  fixture helper so the positive case exercises every field `assessReceipt`
  now checks.
- `packages/mcp-server/src/reconciliation.ts` — `proofEvidence()` calls
  `parseProofReceipts(parsed)` after `matter(raw).data`; a non-empty valid
  list is attached as `receipts` on the returned pass/fail evidence; an
  empty or invalid list omits the field (back-compat with every existing
  fixture and no proof is failed over a malformed `receipts` block alone).
  Unchanged in round 1 — the new checks live entirely in core's classifier.
- `packages/mcp-server/src/reconciliation.test.mjs` — extended the `proof()`
  fixture helper with an optional receipt-head-sha parameter, added
  `proofEvidence` back-compat/surfacing assertions and a `reconcileEvidence`
  test asserting `PROOF_RECEIPT_SHA_MISMATCH`. Round 1: extended `proof()`
  with an optional receipt-job parameter (default `"verify"`, matching the
  existing fixture's already-valid shape) and added a
  `reconcileEvidence`/`proofEvidence` test asserting `PROOF_RECEIPT_REJECTED`
  on both the PASS and FAIL/implementation routes for a `kanmer-gate` job.
- `plugins/kanmer/skills/kanmer-verify/SKILL.md` — Workflow reordered to
  1 read/reconcile, 2 `gh pr view` MERGED, 3 look up the bound receipt
  (new `gh run list`/`gh run view` section with satisfied/rejected/
  in-progress rules), 4 classify packet obligations, 5 create the detached
  worktree only if something is missing, 6 run only the missing checks, 7
  whole-file proof + Done gate (plus the `receipts:` example beside
  `attempts:`). "What is validated by code and what is human judgement in
  this release" reworded in round 1 to state precisely what runs today:
  `assessReceipt` checks receipt shape, `head_sha`, `event`, `job ==
  "verify"`, `workflow == "pr.yml"`, and `conclusion`, and it is called at
  verification time by `reconcileEvidence` — a `head_sha` disagreement
  produces `PROOF_RECEIPT_SHA_MISMATCH`, every other rejection produces
  `PROOF_RECEIPT_REJECTED`. Failure-class table, terminal retirement, and
  handoff prose are unchanged.
- `docs/manual/proof.md` — new short "Receipts" section: additive,
  discharges verify obligations from a hosted CI run, foundational for the
  coming typed `attempts[]` validator. Unchanged in round 1 (already
  accurate at its level of detail; reviewed and left as-is).
- `docs/functional/frd/FRD-006-typed-proof.md` — new "Receipts (MCP-057)"
  subsection under "Compiled-workflow end state". Round 1: reworded to name
  the exact module (`packages/core/src/proof-receipts.ts`), add the
  `workflow == "pr.yml"` and case-sensitivity acceptance details, and state
  that `packages/core/src/reconciliation.ts` calls `assessReceipt` at
  verification time and reports `PROOF_RECEIPT_SHA_MISMATCH` /
  `PROOF_RECEIPT_REJECTED`.
- `apps/gui/src/renderer/src/manual/chapters.generated.ts` — regenerated by
  `npm run build:manual` (required by `verify:docs`/`check:manual` whenever
  `docs/manual/*.md` changes; unchanged content in round 1 since
  `proof.md` itself was not edited this round).
- `plugins/kanmer/mcp/kanmer-mcp.cjs` — rebuilt via `npm run plugin:build`
  in both rounds because `packages/mcp-server/src/reconciliation.ts` and
  `packages/core/src/*` changed; committed per AGENTS §7 convention.
  `npm run plugin:check` confirmed 41 tools, matching bundle bytes, and a
  successful isolated MCP handshake in both rounds.

## Not touched (deliberately out of scope)

- `scripts/agents-block-body.mjs` / `kanmer-setup` skill (PR #321, DOC-028) —
  not touched by this ticket; pulled into this branch only by merging
  `origin/main` in round 1 (see below), byte-identical to `main`.
- Verify-rail scripts (PR #322, CORE-140).
- No receipt store, reuse-key digest, ancestry reuse, new MCP tool, or
  process spawning added anywhere in core.
- `packages/core/src/proof-record.ts` / typed `attempts[]` validation
  (CORE-129) — not created; this ticket adds `receipts[]` beside the
  existing free-form `attempts[]` only, per the plan's explicit sequencing
  (MCP-057 before CORE-129).

## Commands run and exit codes (round 0, superseded numbers — see round 1 below for current)

```
npm ci                                                        # 0
npm run test -w @kanmer/core                                  # 0 (894/894 tests)
npm run build                                                 # 0
node packages/core/scripts/check-browser.mjs                  # 0
npm run typecheck                                              # 0
node --test packages/mcp-server/src/reconciliation.test.mjs packages/mcp-server/src/step-reconciliation.test.mjs
                                                                # 0 (100 tests: 99 pass, 1 platform-skipped, 0 fail)
npm run verify:skills                                          # 0
npm run build:manual                                           # 0
npm run verify:docs                                            # 0
npm run check:manual                                           # 0
npm run plugin:build                                           # 0
npm run plugin:check                                           # 0 (41 tools; ran directly in the linked worktree without refusing)
node packages/mcp-server/src/smoke.mjs                         # 0 (384/384)
```

## Review round 1 remediation

Independent review of PR #325 at head `6b7049c7` returned **needs-changes**
on one blocking finding, F-001 (major): the skill's "What is validated by
code" section, FRD-006, and this report all claimed `assessReceipt` enforces
`job == "verify"`, but the code only checked `job` was a non-empty string —
`job: "kanmer-gate"` on an otherwise-valid receipt assessed `satisfied`. The
review also noted `assessReceipt` had no production caller: `proofEvidence()`
called only `parseProofReceipts`, so `event`/`conclusion`/`job`/`kind` were
enforced by nothing that ran at verification time — only the `head_sha`
comparison in `reconciliation.ts` was live. F-002 (minor, loose `run_id`
typing) was deferred to CORE-129 by the reviewer; F-003 (note, missing
case-sensitivity tests) was folded into this round since it shares the same
table; F-004–F-006 (notes) needed no code or doc change.

Fixes applied, on the same branch `MCP-057-evidence-first-verify`:

1. **`assessReceipt` now checks `job === "verify"` and `workflow ===
   "pr.yml"` exactly** (`packages/core/src/proof-receipts.ts`), each with
   its own rejection reason. Added table cases for a wrong-named job
   (`kanmer-gate`) and a wrong workflow; renamed the pre-existing
   `job: undefined` test to "rejects a receipt missing the job entirely"
   and added the real "rejects a receipt whose job is not verify" case.
   Added case-sensitivity regression cases per F-003: an uppercase 40-hex
   `head_sha` (rejected — the regex has no `i` flag), an abbreviated
   7-character `head_sha` (rejected), and `conclusion: "SUCCESS"`
   (rejected).
2. **Chose to wire `assessReceipt` into core reconciliation** (the
   reviewer's preferred option), rather than only reword the docs, because
   the ticket's own acceptance criteria describe `assessReceipt` as the
   mechanism that rejects a bad receipt with a reason, and leaving it
   unwired while documenting it as enforced would reproduce exactly the gap
   F-001 found. Added `receiptAssessmentRejections()` in
   `packages/core/src/reconciliation.ts`, which calls `assessReceipt` on
   every receipt and returns every rejection reason **except** `head_sha`
   ones (those remain the existing `receiptNamesOtherMerge` /
   `PROOF_RECEIPT_SHA_MISMATCH` path, kept exactly as the reviewer
   specified — "keeps the SHA-mismatch finding as is"). A non-SHA rejection
   now produces a new, distinct `PROOF_RECEIPT_REJECTED` finding on both the
   PASS route and the `implementation`/`plan` FAIL routes, mirroring where
   `PROOF_RECEIPT_SHA_MISMATCH` already sits. Added tests for both routes in
   both `packages/core/src/reconciliation.test.ts` and
   `packages/mcp-server/src/reconciliation.test.mjs`.
3. **Reworded the skill/FRD/report claims to match the now-wired code**:
   `plugins/kanmer/skills/kanmer-verify/SKILL.md`'s "What is validated by
   code" section and the `receipts:` example paragraph now name
   `PROOF_RECEIPT_SHA_MISMATCH` and `PROOF_RECEIPT_REJECTED` as the two
   findings `reconcileEvidence` actually produces, and say `assessReceipt`
   "runs at verification time through `reconcileEvidence`" rather than
   describing it as a library nothing calls.
   `docs/functional/frd/FRD-006-typed-proof.md`'s Receipts subsection got
   the same correction plus the `workflow == "pr.yml"` and case-sensitivity
   details. `docs/manual/proof.md` was reviewed and left unchanged — its
   higher-level prose ("a receipt is accepted only when it names the exact
   merge SHA, the `push` event, a completed `verify` job, and a `success`
   conclusion") was already accurate and did not claim a specific enforcing
   function or call site.
4. **Merged `origin/main`** into the branch before rebuilding/repushing:
   main had moved to `32aa54fc` (DOC-028 at `bd368549`, GUI-152 at
   `32aa54fc`) since the branch was cut. `git merge origin/main` succeeded
   cleanly with no conflicts (`ort` strategy, 23 files, none overlapping
   this ticket's files).

Commands rerun after the fix, all exit 0:

```
npm run test -w @kanmer/core                                  # 901/901 (25 files); proof-receipts.test.ts 20 tests, reconciliation.test.ts 82 tests
npm run build
node packages/core/scripts/check-browser.mjs
npm run typecheck                                              # core, mcp-server, ui, gui
node --test packages/mcp-server/src/reconciliation.test.mjs packages/mcp-server/src/step-reconciliation.test.mjs
                                                                # 101 tests: 100 pass, 1 platform-skipped, 0 fail
npm run verify:skills                                          # ALL CHECKS PASSED
npm run build:manual                                           # up to date, no change this round
npm run verify:docs                                            # PASS — generated manual current
npm run check:manual                                           # up to date, 22 chapters
npm run plugin:build                                           # kanmer-mcp.cjs rebuilt
npm run plugin:check                                           # 41 tools match, bundle bytes match, isolated MCP handshake lists 41 tools
node packages/mcp-server/src/smoke.mjs                         # 384/384
```

Not attempted: relitigating F-002 (deferred to CORE-129 by the reviewer,
unchanged this round) and F-004–F-006 (accepted-risk/note dispositions
requiring no code change).

## Deviations from the plan

- `npm run plugin:check` did not refuse in the linked worktree as the ticket
  anticipated (AGENTS §7's caveat); it ran and passed directly in both
  rounds, so the fresh-clone fallback was not exercised.
- Added the receipt-mismatch, matching-receipt, and (round 1) wrong-job
  cases to `packages/core/src/reconciliation.test.ts`'s existing
  table-driven suites rather than a new file, since that file already
  carries the exact `PROOF_MERGE_SHA_MISMATCH` cases this extends.
- `npm run build:manual` and the resulting `chapters.generated.ts` diff were
  not named in the ticket's file list but are required by `verify:docs`
  after any `docs/manual/*.md` edit; included as a build artifact (round 0
  only — `proof.md` was not re-edited in round 1).

## What stays human-judged

Per the skill's "What is validated by code and what is human judgement in
this release" section (reworded in round 1 for accuracy): code validates
receipt shape, exact `head_sha` match, `event == "push"`, `job ==
"verify"`, `workflow == "pr.yml"`, and `conclusion == "success"`, and does
so at verification time via `reconcileEvidence`'s `PROOF_RECEIPT_SHA_MISMATCH`
and `PROOF_RECEIPT_REJECTED` findings. The human recording the proof remains
responsible for (1) provider provenance — that the receipt genuinely names
the GitHub Actions run it claims and that `observed_by` is accurate — and
(2) the "packet ⊆ npm run verify" coverage judgement — that every obligation
marked satisfied by a receipt is actually a subset of what the `verify` job
in `pr.yml` runs for that ticket's packet.

## Follow-ups for CORE-129

`receipts[]` is deliberately additive beside the existing free-form
`attempts:` list. CORE-129's typed `proof-record/2` parser is expected to
validate `receipts[]` with the same rules exercised here (well-formed
entries preserved, unknown fields preserved, a receipt whose `head_sha`
disagrees with `merged_sha` reported invalid, absence unaffected) per its
own Verification item 4. F-002's loose `run_id`/`attempt`/`workflow` typing
beyond the exact-match checks added in round 1 remains explicitly deferred
to CORE-129, per the reviewer's disposition.
