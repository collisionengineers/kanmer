---
kind: review-attestation
pr: "329"
head_sha: "e36a0db26228e553588c52c6bc83aeaa31fcc5ee"
verdict: pass
reviewer: "independent-reviewer-core-129"
independent: true
plan_hash: "bce07d5dfa349b33"
ticket_updated: "2026-09-05T14:27:00.629Z"
board_sha: "9b88b1a009d665d8b35051e369c1e6e1b4cedaa1"
expected_reviewers:
  - "independent-reviewer-core-129"
threads_snapshot: []
findings:
  - id: "F-001"
    severity: blocker
    summary: "Round 1: parseProofDocument was not pure over its bytes — gray-matter writes its content-keyed module cache BEFORE parsing, so a proof whose YAML threw left `{ data: {} }` behind and read `invalid` once then `legacy` forever after in that process. The census digest was therefore unstable, the cutover's own locked re-read reported drift that had not happened, and the attempt that eventually succeeded would have been bound to a census that had lost every invalid record."
    disposition: fixed
  - id: "F-002"
    severity: major
    summary: "Round 1: checklist line 18 and plan Step 2 asserted that strict mode blocks a WAIVED_BY_OPERATOR record, with the box ticked, while the code deliberately admits a well-formed waiver and nothing pinned either reading."
    disposition: fixed
  - id: "F-003"
    severity: minor
    summary: "Round 1: MCP-057's F-002 and F-010 were dispositioned `deferred-to-ticket: CORE-129`, and this PR addressed neither, so closing CORE-129 would have dropped both deferrals."
    disposition: fixed
  - id: "F-004"
    severity: minor
    summary: "migrateProofValidation's pre-format-3 refusal is unreachable through migrateBoard: it runs after migrateToV3 in the same call, so detectFormat() has already returned 3. The plan's \"refuse to combine the proof cutover with a format migration\" is met only incidentally, by the digest mismatch a format migration would cause."
    disposition: accepted-risk
    reason: "Carried forward unchanged from round 1 and re-checked. The safety property the plan wanted is still delivered by a different mechanism — a censused-then-migrated board yields a different digest, so the cutover refuses without writing — and now that the parser is pure that mismatch is a real signal rather than noise. The guard is correct where it is directly tested; only the tool-level path cannot reach it, and no unsafe write is possible either way."
  - id: "F-005"
    severity: note
    summary: "The strict refusal text, and now plan version 3's Step 2, tell the caller Done needs a valid `proof-record/2` PASS \"at the exact merge SHA\", but ProofGateEvidence carries only { state, diagnostics } — the gate holds no merge SHA and does not check one. Exact-SHA binding exists only in reconciliation, which is advisory."
    disposition: accepted-risk
    reason: "Carried forward unchanged. An overclaim in a message, not in behaviour: the gate is strictly tighter than before, and the SHA binding it names is genuinely enforced one layer out under CORE-133's existing PROOF_MERGE_SHA_MISMATCH. The store has no route to a GitHub merge SHA at gate time, so the check cannot be added here; only the wording is loose."
  - id: "F-006"
    severity: note
    summary: "The `valid-inconclusive` arm of PROOF_RECORD_NOT_AUTHORITATIVE's explanation is unreachable from proofEvidence, which maps valid-inconclusive to { state: \"fail\", failureClass: \"inconclusive\" } and so takes the earlier FAIL branch to VERIFICATION_INCONCLUSIVE."
    disposition: accepted-risk
    reason: "Carried forward unchanged. Dead defensive text on a warning-level finding, reachable only by a host assembling evidence by hand. It cannot produce a wrong route; the worst case is a correct refusal under a differently-worded message."
  - id: "F-007"
    severity: note
    summary: "Round 1: the post-implementation report's CI section inverted the two run ids and attributed the cancellations to board pushes and `regate`."
    disposition: fixed
  - id: "F-008"
    severity: note
    summary: "The reported census drifted by one ticket from ordinary board churn between readings."
    disposition: fixed
  - id: "F-009"
    severity: note
    summary: "The remediation of my round-1 blocking list is complete except for one wording item: deviation 7 in the post-implementation report still reads \"There is no MCP path to relax strict → report. Only the GUI Settings save (which reaches setBoard) can do it\", and the PR body still carries the round-0 census figures (318 legacy / 425 total) and the same deviation-7 sentence."
    disposition: accepted-risk
    reason: "Record accuracy only, and the record that binds the merge gate — this attestation — carries the corrected reading in both rounds. I re-verified the substance this round: the GUI has no control that writes proofValidation and its draft is a structuredClone that round-trips the field, so there is no in-product relax path at all, only a board.yml edit. That is acceptable for 0.4.2 because the intended direction is report → strict and the core layer already permits the reverse when a control is added. Not worth a further return; worth a one-line edit whenever the report is next touched."
  - id: "F-010"
    severity: note
    summary: "The gray-matter cache mechanism behind F-001 is a repository-wide class, not a single call site: frontmatter.ts:66, groups.ts:76 and review-attestation.ts:43 all still call matter(raw) with no options and so still populate and read that cache."
    disposition: accepted-risk
    reason: "Analysed rather than assumed, and the conclusion is that the proof parser was uniquely exposed. In all three remaining callers an empty frontmatter object is already an error — parseItem and parseGroup hand `{}` to a zod schema with required fields, which throws, and parseReviewAttestation falls through to an `invalid` verdict on `kind` — so a poisoned second read changes the message and never the outcome. Only proof-record.ts had `{}` as a meaningful, benign state (`legacy`), which is precisely why the defect was semantic there and cosmetic elsewhere. Fixing the others is a tidy-up outside this ticket's packet, not a latent correctness bug."
  - id: "F-011"
    severity: note
    summary: "`kanmer-gate` is red at this head (run 33971806238, job 101322781903). Its sole failing check is STALE_REVIEW, naming my own round-1 attestation head 1aa725ee against PR head e36a0db2. NO_REVIEW_RECORD, SYNC_REQUIRED, WRONG_STAGE, WRONG_TARGET, OPEN_QUESTIONS, DEPENDENCY_BLOCKED, NO_TICKET and COMMITS_UNREACHABLE all pass, with `strict: true`."
    disposition: accepted-risk
    reason: "Self-referential and discharged by this record. The gate reads the remote board tip and does not re-run when the board is pushed, so it must be re-run after this push and observed green before merging; that observation belongs to the merger and this record cannot assert it in advance. Required `verify` is green at this exact head (job 101322782715, 9m23s)."
---

# Review — CORE-129 (round 2, delta, re-bound to `e36a0db2`)

Verdict: **pass**. No finding of any severity is open. I did not implement this
ticket, and this is a pass on the change, not a merge authorisation — see F-011.

Reviewed at head `e36a0db26228e553588c52c6bc83aeaa31fcc5ee`, PR
[#329](https://github.com/collisionengineers/kanmer/pull/329), plan version 3
(`bce07d5dfa349b33`), checklist version 3, board `9b88b1a0`.

This is a delta review, scoped to what moved since the round-1 attested head
`1aa725ee`: the merge of `origin/main`, the remediation commit, their direct
callers and contracts, and the relevant tests. The round-1 consolidated review
of the whole PR stands and is not reopened. Formally `review_round` is still 0 —
the ticket was never moved back to Implementing, so no remediation budget was
consumed; the remediation was taken out of band on the same PR.

## What moved

Two commits.

- `9ce32b07` — `git merge origin/main` (`58718455`). Five files: `AGENTS.md`,
  `packages/mcp-server/scripts/run-http-tests.mjs`, `scripts/build-stamp.mjs`,
  `scripts/run-tests.mjs`, `scripts/verify-steps.test.mjs` — CORE-144 and
  CORE-145 exactly. Four are **blob-identical** to `origin/main`. `AGENTS.md` is
  not, and should not be: CORE-145 edits it and so does this ticket. I checked
  the merge lost nothing — `git diff 58718455 e36a0db2 -- AGENTS.md` and
  `git diff origin/main...e36a0db2 -- AGENTS.md` are the same two hunks, both
  CORE-129's own (the proof-tree comment and the §5 core paragraph), layered
  over CORE-145's content with nothing of `main`'s reverted. The full PR diff
  against current `main` is still **35 files**, unchanged in shape.
- `e36a0db2` — the remediation. Six files: `proof-record.ts` (+43/-2),
  `proof-record.test.ts`, `migrate.test.ts`, `docs.test.ts`, FRD-006, and the
  rebuilt bundle. No production file other than the parser changed;
  `gates.ts`, `store.ts`, `types.ts`, `board.ts`, `migrate.ts` and both
  `reconciliation.ts` are byte-identical to what I passed in round 1. The
  bundle delta is exactly the two lines of the fix.

## F-001 — fixed, and the reasoning is right

The mechanism claim is correct, and I checked it in `node_modules` rather than
taking it:

```js
// gray-matter/index.js
if (!options) {
  if (cached) { … return file; }
  matter.cache[file.content] = file;   // written first; file.data is still {}
}
return parseMatter(file, options);     // ← this is what throws
```

Both the read and the write sit inside `if (!options)`, so any options object
bypasses the cache entirely — there is indeed no `cache: false` option, and
passing an inert constant is the correct escape. I also confirmed the constant
is genuinely inert: `lib/defaults.js` does
`opts.language = (opts.language || opts.lang || 'yaml').toLowerCase()`, so
`language: "yaml"` *is* the default, and a fence-declared language still wins
because `parseMatter` overwrites `file.language` from
`matter.language(str, opts)` and `parse()` reads `file.language`, not
`opts.language`. `defaults()` also copies with `Object.assign({}, options)`, so
the frozen `as const` object is never mutated. Nothing about how a proof is
read changes.

Rejecting `matter.clearCache()` was the right call for the reason given: it
mutates a global every caller shares and only helps the reader who remembers.

**Verified, not read.** Against the fixed parser, on the real bytes that
produced the defect:

```
GUI-133, five consecutive parses: invalid, invalid, invalid, invalid, invalid
GUI-135, three consecutive parses: invalid, invalid, invalid
```

Three censuses in one process, on a fresh copy of the live board:

| Reading | complete | counts | digest |
|---|---|---|---|
| dry run 1 | true | 0 valid / 319 legacy / 2 invalid / 105 absent / 426 | `proof-census-v1:292605b3…` |
| dry run 2 | true | identical | identical |
| dry run 3 | true | identical | identical |

Identical, and identical to the digest the implementer reported — so their
reading and mine are the same board. The two invalid records survive every
reading and are still GUI-133 and GUI-135.

Purity: after all three dry runs, SHA-256 of all **3414** files in the copy is
**byte-identical** to the pre-run snapshot.

The cutover now succeeds **on the first attempt**, which is the property that
was actually broken:

```
digest: proof-census-v1:292605b3…
FIRST-ATTEMPT cutover -> from: report  to: strict  changed: true  refused: null
idempotent repeat     -> to: strict  changed: false  refused: null
```

Exactly one file changed across the whole copy — `.kanmer/data/board.yml` — and
the only delta in it is:

```yaml
proofValidation:
  mode: strict
```

No proof, ticket, stage or activity record touched. CORE-141's Verification
step 3 is now executable as written.

**Mutation test.** Reverting the fix alone — `matter(raw, PARSE_OPTIONS)` back
to `matter(raw)` — turns **exactly 4 tests red** across `proof-record.test.ts`
and `migrate.test.ts`. All four claimed regression tests are genuinely
load-bearing. File restored; `git status --short` empty.

The tests are well built. The unique-per-test malformed fixture in
`migrate.test.ts`, with the comment explaining that a shared constant would let
the first test poison the cache and let every later one pass under a broken
parser, is exactly the right insight about testing a defect of this shape.

## F-002 — fixed: behaviour kept, and now pinned in both directions

The decision to keep the behaviour is right, and I agree with the reasoning: a
waiver is the one result a machine may not write, it must name a person and a
reason, and `kanmer-verify` has always said only a PASS or an operator's waiver
permits the final move. The asymmetry that keeps it honest — reconciliation
never recommends Done from one — is unchanged in `proofEvidence`.

What was missing is now present at all four levels: FRD-006's "Report and
strict" section states it in a governing document; plan version 3 corrects Step
2 and the acceptance checks in a versioned banner rather than a silent edit;
checklist version 3 corrects line 18 and adds a dedicated line naming the
reconciliation asymmetry; and three tests in `docs.test.ts` drive a **real
store on a strict board** through `moveItem` to Done — a well-formed waiver
admitted, one missing `waived_by` refused, one missing `waiver_reason` refused.
The two refusals assert the parser's own diagnostic text, which also
incidentally pins that `detail` reaches the move refusal.

**Mutation test.** Making a waiver resolve to its ledger result instead of
`valid-pass` turns the admission test red. The direction I flagged as unpinned
is now genuinely pinned.

## F-003 — fixed

`CORE-147` exists, is linked from CORE-129, and carries both MCP-057 deferrals
accurately: the `run_id`/`attempt`/`provider`/`repo` validation gap and the
`"verify"`/`"pr.yml"` literals shipping inside `@kanmer/core` to consumers whose
CI is named otherwise. It has its own acceptance criteria and a technical seam,
and it sits in HZN-010, which is the right horizon for a consumer-configuration
change. The deferral survives CORE-129 closing.

## F-007 — fixed

The report's "Review round 1 remediation" section carries an F-007 subsection
that corrects the account from the API and says plainly that the earlier
attribution "was a guess presented as a finding". `regate` was `skipped` in both
runs and could not have cancelled anything; the cause is successive
`pull_request` events on #329 in one concurrency group. That is the same
conclusion I reached independently. One residual detail is uncertain rather than
wrong — the report labels run `33969406401` "(draft PR opened)" while the commit
timeline has a push at 13:34:08 and the run created at 13:36:51, which reads
more like `synchronize` — but it does not change the finding either way and I
am not raising it.

## Round-1 findings carried forward unchanged

F-004, F-005 and F-006 are re-checked against this head and unchanged; their
reasons are in the frontmatter. F-005 is worth one more sentence: plan version 3
now repeats "at the exact merge SHA" in Step 2's strict clause, so the loose
wording has spread by one document. It remains a description problem, not a
behaviour one.

## New this round

F-009 (one uncorrected wording item in the report and a stale PR body) and F-010
(the residual gray-matter cache class in three other callers) are both notes and
both dispositioned above. F-010 deserves the summary here because it arises
directly from the fix: I checked whether the other three `matter(raw)` callers
share the defect, and they do share the *mechanism* but not the *consequence* —
`parseItem` and `parseGroup` feed `{}` to a zod schema with required fields and
throw either way, and `parseReviewAttestation` returns `invalid` either way. The
proof parser was uniquely exposed because it alone treats an empty frontmatter
object as a benign, meaningful state. That asymmetry is why fixing one call site
is a complete fix and not a partial one.

## Scoped checks re-run at `e36a0db2` — all green

| Command | Exit | Result |
|---|---|---|
| `npm run build && node scripts/build-stamp.mjs --write` | 0 | stamp `head e36a0db26228, dirty=false` |
| `npm run test -w @kanmer/core` | 0 | 26 files / **1002 tests** (995 → 1002: +1 purity, +3 census stability, +3 waiver) |
| `npm run typecheck` | 0 | core, ui, gui (node + web) |
| `node packages/core/scripts/check-browser.mjs` | 0 | `proof-record` still absent from `browser.ts` |
| `node --test …/reconciliation.test.mjs …/step-reconciliation.test.mjs …/check-pr.test.mjs` | 0 | 114 tests, 113 pass, 0 fail, 1 platform skip |
| `node packages/mcp-server/src/smoke.mjs` | 0 | 387/387 |
| `npm run golden` | 0 | 20/20 scenarios |
| `npm run verify:skills` | 0 | ALL CHECKS PASSED |
| `npm run verify:docs` | 0 | generated manual current |
| `npm run check:manual` | 0 | 22 chapters up to date |
| `npm run plugin:build` then `git status --short` | 0 | **empty** — bundle byte-stable |
| `npm run plugin:check` | 0 | **41 tools**, bundle bytes match, isolated handshake lists 41 |
| mutation ×2 (F-001 fix reverted; waiver state changed) | — | 4 red, then 1 red; worktree restored clean |

Scope is unchanged and still clean: no `scripts/verify.mjs`,
`agents-block-body.mjs` or `.github/workflows/pr.yml` in this ticket's diff, no
hand-edited `apps/gui/src/**` beyond the generated manual chapter, and no
`package.json`/`package-lock.json`, so no new dependency.

## CI at this head

Run **33971806238** (`pull_request`, 14:26:10Z, head `e36a0db2`):

| Job | Id | State |
|---|---|---|
| `verify` | 101322782715 | **pass** (9m23s) |
| `kanmer-gate` | 101322781903 | failure — `STALE_REVIEW` only (F-011) |
| `regate` | 101322782485 | skipped (PR event) |

The gate's JSON is unambiguous: `NO_REVIEW_RECORD` **pass**, `SYNC_REQUIRED`
**pass** ("review attestation board `99029731…` is on the fetched board tip
`9b88b1a0…`"), `WRONG_STAGE`, `WRONG_TARGET`, `OPEN_QUESTIONS`,
`DEPENDENCY_BLOCKED`, `NO_TICKET` and `COMMITS_UNREACHABLE` all pass, `strict:
true`, and the single failure names my own round-1 head. This record replaces
it.

## Threads

GitHub GraphQL at this head: `reviewThreads` 0, `reviews` 0. `threads_snapshot:
[]` is the truthful value. Three issue comments exist, all by the author; none
is a review thread and none is a gate. No bot thread was posted.

## Merge preconditions the merger still owns

This is a pass on the change. Before merging:

1. Push this board and **re-run `kanmer-gate` at `e36a0db2`, observing it
   green** — the gate reads the remote board tip and does not re-run on a board
   push, so any gate result from before this push is evidence about a board the
   remote never saw.
2. Confirm the head has not moved again. The PR is currently `MERGEABLE` /
   `BLOCKED`, and `BLOCKED` is the red `kanmer-gate` above.
3. Note that the ticket's claim lapsed at 2026-09-05T14:17:07Z
   (`claim_expires_at`), so the Review → Verifying move may need the claim
   refreshed first.

## Residual risk

Unchanged from round 1 and small. The strict gate is a statement about a
record's internal consistency, not about the commit — exact-merge-SHA binding
lives in reconciliation, which is advice (F-005). Deviation 1 stands accepted:
`legacy` yields no Done recommendation in either mode, which is right, changes
no proof byte and moves no ticket, and should not be made mode-tolerant.
`report` remains the live board's mode, so nothing in this change alters a
single existing move; the strict cutover is CORE-141's decision and is now
actually performable.

I did not merge, did not move the ticket, and did not push the PR branch.
