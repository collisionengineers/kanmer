# Post-implementation report — CORE-129

**PR:** https://github.com/collisionengineers/kanmer/pull/329 · **Head:** `1aa725eed1ba21b209f9981d8ab7e8881abe9c02`
**Branch:** `CORE-129-typed-proof-record` · **Base:** `main` at `37b83b14`, with
`origin/main` (`9945b1f2`, carrying MCP-057 `e474f317`, CORE-138, DOC-026,
CORE-140) merged in before the PR opened.

Delivers `proof-record/2` validation, a board-owned `report`/`strict` proof
policy, a read-only census with a digest-bound cutover, and one shared parser for
the movement gate and reconciliation. Plan version 2 (2026-09-05) is the contract
this was built against.

## Delta per required change

### 1 — one versioned proof parser

`packages/core/src/proof-record.ts` (new, exported from `index.ts`, deliberately
not from `browser.ts`). `parseProofRecord(frontmatter)` is pure; `parseProofDocument(raw)`
is the `gray-matter` wrapper, mirroring `review-attestation.ts`'s shape.

- States: `valid-pass | valid-fail | valid-inconclusive | legacy | invalid`, each
  with deterministic, sorted diagnostics.
- `schema: 2` semantics as planned: `kind`, 40-hex `merged_sha`, non-empty
  `environment`, ISO `verified_at`, `result`, non-empty `attempts[]`. Attempts
  carry `attempted_at`, `result`, `authority`, `summary`, a compatible
  `failure_class` and either complete process evidence or the explicit manual
  form (`exit_code: null` with no `command`/`cwd`).
- Timestamps strictly increase (ties refused); the final entry must be
  `authoritative`; top-level `result`/`failure_class`/`verified_at` are bound to
  it. `verified_at` is compared as an *instant*, so an equivalent but
  differently-punctuated timestamp is not refused for its formatting.
- `WAIVED_BY_OPERATOR` is top-level only and requires `waived_by` +
  `waiver_reason`; it is the one exception to that binding and is flagged
  (`waived: true`) so an automated recommender can decline it.
- Unknown **top-level** keys are preserved on `unknown` and reported; unknown
  **attempt** keys are refused (an attempt is the unit the verdict is computed
  from; an unrecognised key there could be an authority claim this build ignores).
- `receipts[]` is decoded by MCP-057's `parseProofReceipts` — never
  re-implemented — and a receipt whose `head_sha` ≠ the record's own `merged_sha`
  makes the record `invalid`.
- Anything without `schema: 2` is `legacy` and never parsed for meaning. A
  `schema` this build does not recognise is `invalid`, not `legacy`, so an
  unrecognised number cannot buy silence.

`proof-record.test.ts`: 53 tests, table-driven across the full negative matrix
plus the preserved cases (single authoritative PASS, supporting-then-authoritative
ledger, manual attempt, unknown top-level keys, `Date`-valued timestamps, a
CORE-042-shaped free-prose record reported `legacy`).

### 2 — board-owned report/strict policy

- `ProofValidationConfigSchema` + optional `proofValidation` on `BoardConfig`
  (zod, additive). `resolveProofValidation(board)` returns `{ mode, source }`;
  absent ⇒ `{ report, default }`, explicit ⇒ `{ …, board }`.
- `defaultBoardConfig()` writes `{ mode: "strict" }`.
- `EvidenceProbe` gains an **optional** `proofState()`; `EvaluateInput` gains an
  optional `proofValidation`. Absent ⇒ `report`, so an untaught caller keeps its
  semantics exactly.
- `RequirementStatus` gains `detail` — deliberately *not* `warning`, keeping
  `gates.ts`'s existing rule that warnings are the non-blocking channel. Strict
  refusals carry `detail`; report-mode findings carry `warning`. The visual
  advisory now **appends** to `warning` rather than assigning, so one finding
  cannot silently replace another.
- `store.gateReport` reads the canonical `proof/proof.md` once per report
  (memoised promise) and parses it; `gateReportFromExecutionAuthority` reads the
  same document out of the packet's own inventory so the packet's gate answer is
  computed from the bytes the packet reports.
- `assertDocGate` quotes `detail` in the refusal, so an agent is told "the proof
  is legacy" rather than "needs proof" about a file it can see.
- `setBoard`/`updateBoard` refuse a report-or-absent → strict escalation
  (`PROOF_VALIDATION_ESCALATION_REFUSED`). Relaxing strict → report is allowed:
  relaxing a gate strands nobody. Strict is reachable only through
  `store.activateStrictProofValidation(assertCurrent)`, which re-asserts under
  the board write lock and is idempotent.
- `get_status.proofValidation` and `list_board.proofValidation` report
  `{ mode, source }`.

### 3 — census and digest-bound cutover in `migrate_board`

`migrate.ts` gains `auditProofRecords`, `ProofCensus`, `ProofValidationReport`
and `migrateProofValidation`; `migrateBoard` runs it **last**, after the format
steps, and returns it as `proofValidation`.

- The census reads only canonical `proof/proof.md`, sorted by ticket id so the
  digest is a function of board content and not directory order. Buckets:
  `valid | legacy | invalid | absent`, with per-ticket state, stage, archived
  flag, byte length, sha256 and diagnostics.
- `digest` = `proof-census-v1:<sha256>` over the parser version and every
  ticket's identity/stage/archived/bytes/sha256/state.
  `PROOF_RECORD_PARSER_VERSION` (`proof-record/2#1`) is inside it, so a digest
  taken by an older parser cannot authorise a cutover under a newer one.
- Any listing or read failure ⇒ `complete: false` ⇒ cutover forbidden.
- Refusals, all without writing: no digest (never enables strict), `dry_run`
  with a digest, a pre-format-3 board, an incomplete census, a stale digest, and
  drift observed under the lock. Already-strict is idempotent (`changed: false`,
  same census, assertion not re-run).
- The MCP tool gains `proof_census_digest?` and a rewritten description. **No
  new tool; the roster stays 41** (`plugin:check` verified).

### 4 — one parser for gating and reconciliation

- `packages/mcp-server/src/reconciliation.ts::proofEvidence` now delegates to
  `parseProofDocument`; its own `gray-matter` decoder and `validTimestamp` are
  deleted.
- `legacy` and `invalid` ⇒ `state: "invalid"`; a waiver ⇒ `invalid` (a human
  decision, not an automated recommendation); `valid-inconclusive` ⇒
  `fail`/`inconclusive` so the classifier reaches its existing
  `VERIFICATION_INCONCLUSIVE` finding rather than the mute `invalid` path.
  MCP-057's `receipts` surfacing is unchanged.
- `ReconciliationEvidence["proof"]` gains an additive `record?: { state, diagnostics }`,
  and `reconcileEvidence` emits a new warning-level
  `PROOF_RECORD_NOT_AUTHORITATIVE` naming which kind of "no" it read. Without a
  `record` the behaviour is exactly as before (the generic
  `NO_RECONCILIATION_NEEDED`), so a host that predates this is unaffected.
- `reconcile_ticket` stays read-only; the six apply actions are untouched.

### 5 — prose and generated artefacts

ADR-0011 gains a full amendment ("a second bounded content reader"), arguing the
three properties and stating two limits (never invents authority; off unless a
board turns it on). FRD-002 gains P5a and an amended AC1; FRD-006 gains R7, a
"Report and strict" section, three new acceptance criteria and a reconciled
MCP-057 forward reference. `docs/manual/proof.md` and `gates.md` gain
user-facing sections. `kanmer-verify` documents schema 2, `authority`, the two
attempt shapes and the waiver fields; `kanmer-closeout`, `kanmer-auto` and
`kanmer-setup` (report → census → strict) follow; the tool reference is rewritten
for the record and the `migrate_board` row. AGENTS.md §4 and §5 updated. Manual
regenerated, plugin bundle rebuilt and committed.

## Test coverage added

| File | What it pins |
|---|---|
| `proof-record.test.ts` (new, 53) | the whole parser contract: accepted shapes, the negative matrix, chronology/authority binding, waivers, receipts, legacy |
| `gates.test.ts` (+8) | report vs strict in `statusOf`; the absent-policy default; diagnostics surfaced verbatim; refusal in `detail` and never in `warnings`; the visual advisory appended not replaced |
| `board.test.ts` (+5) | resolution and `source`; fresh-board strict; `board.yml` round-trip; an unknown mode refused |
| `store.test.ts` (+6) | `setBoard`/`updateBoard` escalation refused (whole write refused); relaxing allowed; the cutover writes only the policy, re-asserts, refuses on assertion failure, and is idempotent |
| `migrate.test.ts` (+9) | bucketing; byte fingerprints; digest stability and sensitivity; dry-run purity; stale digest; a successful cutover leaving proof bytes identical; idempotency; the pre-format-3 refusal |
| `docs.test.ts` (+7) | end-to-end strict Done refusals and the report-mode warning, through a real store |
| `reconciliation.test.ts` (+6) | `PROOF_RECORD_NOT_AUTHORITATIVE` per state, and its absence on the PASS/FAIL routes and on record-less evidence |
| `packages/mcp-server/src/reconciliation.test.mjs` | fixtures upgraded to schema 2; the decoder tests rewritten for the new contract |
| `smoke.mjs`, `golden-board.mjs` | strict gate refusal and admission end to end; the census dry run; GB-16's routes on typed records |

## v0.4.2 census — run against a COPY of the live board

`cp -r .worktrees/kanmer/.kanmer "$TMP/kanmer-board-copy/.kanmer"`, then
`auditProofRecords` against that copy. The live board was **not** touched
(`git status --short` in `.worktrees/kanmer` clean, before and after).

| Bucket | Count |
|---|---|
| valid | **0** |
| legacy | **318** |
| invalid | **2** |
| absent | **105** |
| **total tickets** | **425** |

- `complete: true`, `problems: 0`, `parserVersion: proof-record/2#1`
- `digest: proof-census-v1:34c59bffcd8704f1eb2aa1be8109ed35c26bc9124bb492b604c0c167f70ff2e1`
  (a point-in-time reading of the copy; the cut must take its own)
- The two `invalid` records are **GUI-133** and **GUI-135**, both Done, both
  refused for unparseable YAML frontmatter (an unknown escape sequence in a
  Windows path, and a multiline implicit key) — exactly the two records the
  original research predicted. Neither is rewritten.
- **CORE-042** → `legacy` (4698 bytes) and **GUI-141** → `legacy` (1597 bytes),
  which is the ticket's Verification item 2 satisfied against the real documents.
- By stage: Done 308 legacy / 2 invalid / 70 absent; archived Verifying 9 legacy
  / 1 absent; archived Review 1 legacy; every live non-Done ticket has no
  canonical proof yet.
- Zero valid records is expected and is the whole reason the cutover is
  deliberate: no proof written before this ticket declares `schema: 2`. The live
  board therefore stays in `report` until CORE-141 decides at the 0.4.2 cut.

## Commands (exit codes)

| Command | Exit |
|---|---|
| `npm ci` | 0 |
| `npm run build && node scripts/build-stamp.mjs --write` | 0 |
| `npm run test -w @kanmer/core` | 0 |
| `npm run test:built` | 0 |
| `npm run typecheck` | 0 |
| `node packages/core/scripts/check-browser.mjs` | 0 |
| `node --test packages/mcp-server/src/reconciliation.test.mjs` | 0 (51 tests) |
| `node packages/mcp-server/src/smoke.mjs` | 0 |
| `npm run golden` | 0 (20/20 scenarios) |
| `npm run verify:skills` | 0 (ALL CHECKS PASSED) |
| `npm run verify:docs` | 0 |
| `npm run check:manual` | 0 (22 chapters up to date) |
| `npm run plugin:build` | 0 (bundle committed) |
| `npm run plugin:check` | 0 (41 tools match, bundle bytes match) |

## Deviations and judgement calls

1. **`legacy` yields no Done recommendation regardless of board mode.** The plan
   and the ticket both say so, and it is a behaviour change for every existing
   board: `reconcile_ticket` will stop recommending Done for tickets whose proof
   predates schema 2. `report` relaxes the *gate* a human passes through, not the
   *advice* a machine gives — and the defect that motivated this ticket was
   precisely a machine acting on an unvalidated record. Flagged for review.
2. **Schema 2 drops `NOT_APPLICABLE` and makes `failure_class` mandatory on a
   FAIL.** Schema 1's "a proof naming no class is treated as `inconclusive`" was
   a repair at read time; schema 2 refuses the ambiguity at write time instead,
   and an inconclusive outcome is written as `result: INCONCLUSIVE`. Legacy
   records keep their old reading because they are never validated.
   `failureClassOf` is retained at the MCP boundary as documentation of the
   default; it can no longer be reached with an unknown value.
3. **A mismatched receipt is now refused one layer earlier.** Making
   `head_sha ≠ merged_sha` invalidate the record (ticket Verification item 4)
   means MCP-057's `PROOF_RECEIPT_SHA_MISMATCH` is no longer reachable *through
   this build's decoder* — `PROOF_MERGE_SHA_MISMATCH` or the parser catches it
   first. The finding is kept and still tested at the `reconcileEvidence` level
   with directly-constructed evidence, because it answers a different question
   (receipt vs the **live** PR merge SHA) and must hold for evidence assembled by
   any host. Called out because it converts one MCP-057 test from an integration
   assertion into a unit one.
4. **A manual attempt may not carry `command`/`cwd`.** Research required
   all-or-none process evidence; the previous verify prose invited
   `command: "<exact command or manual check>"` on a manual attempt, which is
   ambiguous. The skill now says manual attempts describe the procedure in
   `summary`. Exit/result consistency is only checked when an exit code is
   actually present, so a manual PASS remains writable.
5. **Test fixtures split two ways.** Suites that model an *existing* board
   (`docs`, `store`, `delivery`, `release`) set `proofValidation: { mode: "report" }`
   in their `beforeEach` with a comment saying why; suites that assert the new
   behaviour build their own strict store. `smoke.mjs` and `golden-board.mjs`
   were upgraded to write schema-2 records instead, so both surfaces exercise
   strict end to end. `capture.test.ts`, `project.test.ts` and
   `profile-matrix.test.ts` needed no change at all — worth noting, because it
   says the fresh-board strict default did not disturb the profile/gate matrix.
6. **No GUI change was required.** `gateError.ts` and `gateFeedback.ts` parse
   requirement names and `blockedBy` strings, neither of which changed shape;
   `npm run typecheck` covers both. The GUI sees the new `detail` and the richer
   warnings through the existing gate report without code changes.
7. **There is no MCP path to relax strict → report.** Only the GUI Settings save
   (which reaches `setBoard`) can do it. The intended direction is report →
   strict, and adding a tool was out of scope; noted rather than fixed.
8. **`plugin:check` ran cleanly inside the worktree** — the brief's clean-clone
   fallback was not needed.

## Final rail figures (build once, `test:built` at head `1aa725ee`)

`npm run build && node scripts/build-stamp.mjs --write` then `npm run test:built`
— **exit 0**, stamp `head 1aa725eed1ba, dirty=false`. Per step:

| Step | Result |
|---|---|
| `check:manual` | 22 chapters up to date |
| `@kanmer/core` | 26 files / **995 tests** passed |
| `@kanmer/gui` | 57 files / **646 tests** passed |
| `@kanmer/mcp-server` HTTP/node suites | passed (includes the 51 reconciliation tests and the promotion fixtures) |
| `test:scripts` | 13 suites / **193 tests** passed |

## Hosted checks

`kanmer-gate` passed on the draft push. Marking the PR ready superseded that run
(GitHub cancelled run `33969786183` with "Canceling since a higher priority
waiting request … exists" — the ordinary concurrency behaviour CORE-138 addresses,
not a real failure); run `33969406401` re-ran `verify` and `kanmer-gate` on the
ready event and was in progress at handoff. The reviewer should read the current
run, not the cancelled one.

## A note on this branch's commit list

Implementation began before #325 (MCP-057) merged, so `pr325` was merged into this
branch to obtain `proof-receipts.ts`. Main squash-merged the same content as
`e474f317`, so MCP-057's original commits appear in `git log main..HEAD` while
contributing nothing to the diff: `git diff --name-only main...HEAD` is 35 files
and contains no `proof-receipts.*`, which is the "identical to main" signal. The
diff is CORE-129 only; the double-merge is visible in the commit list alone, and
is also flagged as a comment on the PR.

---

# Review round 1 remediation

Independent review returned **needs-changes** (attestation `25c1f0e44248cff2`).
Head after remediation: **`e36a0db26228e553588c52c6bc83aeaa31fcc5ee`**
(`origin/main` `58718455` — CORE-144/CORE-145 — merged first).

## F-001 (blocker) — the parser was not a function of its input

**Confirmed and reproduced.** `gray-matter` memoises parsed files in a
module-global keyed on the input string, and writes that entry **before**
parsing:

```js
matter.cache[file.content] = file;   // file.data is still {}
return parseMatter(file, options);   // ← this is what throws
```

So a document whose YAML throws leaves `{ data: {} }` cached under its own
bytes, and every later read of those bytes returns empty frontmatter instead of
throwing — `invalid` once, `legacy` (no `schema`) for the rest of the process.
A three-call reproduction printed `THREW`, `{}`, `{}`.

That is why the reviewer saw a dry-run digest (`0e5e6606…`, 2 invalid) differ
from the locked re-read (`ffcc83ee…`, 0 invalid) over identical bytes and
sha256s: the cutover was refused, and a *second* attempt would have succeeded
bound to a census that had silently lost every invalid record.

**Fix.** Every `gray-matter` call in `proof-record.ts` now passes a
module-level `PARSE_OPTIONS`. The mechanism is the `if (!options)` guard around
both the cache read and the cache write — `gray-matter` bypasses the cache
entirely for any call that supplies options, because it would otherwise have to
key on the options too. `PARSE_OPTIONS` is therefore deliberately inert
(`language: "yaml"` is the library's own default for a `---` fence); the point
is that it *exists*, and the doc comment says so at length so nobody
"simplifies" it away.

Two corrections to my own first attempt, worth recording:

- I first wrote `{ cache: false }`. It worked, but for the wrong reason — there
  is no `cache` option in `gray-matter`; *any* options object suppresses the
  cache. The name would have taught a future reader something false, and it also
  failed the `dts` build (`cache` is not in `GrayMatterOption`), which is how I
  noticed. `npx vitest` alone did not catch it because esbuild strips types.
- `matter.clearCache()` was rejected as the fix: it mutates a global every
  caller shares and only helps the reader that remembers to call it — the next
  reader of the same bytes is corrupted again. Not writing the entry at all is
  the property worth having.

**Regression tests — all four verified to fail without the fix** (reverted the
one-line change, re-ran, saw 4 red; restored, saw 83 green):

| Test | File |
|---|---|
| the same malformed bytes parse `invalid` on every call in one process, and a valid record read between them disturbs neither answer | `proof-record.test.ts` |
| two dry-run censuses over an unchanged board return the same digest and the same buckets | `migrate.test.ts` |
| a dry run's digest still authorises the real cutover, which writes only the board policy and leaves every proof byte-identical | `migrate.test.ts` |
| repeated censuses keep reporting the malformed record as invalid | `migrate.test.ts` |

The malformed fixture is **unique per test** (a counter in `beforeEach`). A
shared constant would have let the first test poison the module cache and the
rest would then have passed under a broken parser — which is exactly what
happened on my first pass: the cutover test passed even with the defect present
until the fixtures were made distinct.

### F-001 acceptance: the census, twice, on a fresh copy of the live board

`cp -r .worktrees/kanmer/.kanmer "$TMP/kanmer-board-copy2/.kanmer"`, then two
`migrate_board` dry runs plus a direct `auditProofRecords`, **all in one
process**. The live board was not touched.

| Reading | complete | counts | digest |
|---|---|---|---|
| dry run 1 | true | valid 0 / legacy 319 / invalid 2 / absent 105 / total 426 | `proof-census-v1:292605b3db6f563df8bc234e0de367ecd958bc8f8375eacccc5824cf6459ac0d` |
| dry run 2 | true | *identical* | *identical* |
| direct audit | true | *identical* | *identical* |

**All three digests match.** The two invalid records are **GUI-133** and
**GUI-135** (both Done, both unparseable YAML frontmatter) and they survive
every reading — under the old code the second reading lost them. **CORE-042**
and **GUI-141** both still read `legacy`. `problems: 0`, and the mode before the
run is `report` with `changed: false`, so nothing was written.

Counts moved from round 1 (318 legacy / 425 total) only because CORE-147 was
filed in between; the delta is one new ticket with no proof.

## F-002 (major) — waiver semantics decided and pinned

**Decision: keep the behaviour.** A well-formed `WAIVED_BY_OPERATOR` record
parses to `valid-pass` and therefore satisfies the strict gate. It is a named
human's explicit disposition, `kanmer-verify` has always said "only `PASS`, or
an operator's `WAIVED_BY_OPERATOR`, permits the final move", and FRD-006 R7
already described it that way. The asymmetry that keeps it honest is unchanged:
reconciliation never recommends Done from a waiver, because deciding to ship
despite the evidence is not a machine's call.

What was wrong was that nothing pinned the reading and two documents asserted
its opposite:

- `checklist/checklist.md` line 18 said waived records block Done — **corrected**
  (checklist version 3), and a dedicated line now states the accepted reading
  plus the reconciliation asymmetry.
- `plan/plan.md` Step 2's negative-case list said the same — **corrected**
  (versioned plan correction, version 3, with the reasoning recorded in the
  banner rather than silently edited).
- `docs/functional/frd/FRD-006-typed-proof.md` now states it explicitly in the
  "Report and strict" section, so a governing document carries the rule.
- Three new tests in `docs.test.ts`, through a real store on a strict board:
  a waiver naming the operator and the reason is admitted to Done; one missing
  `waived_by` is refused; one missing `waiver_reason` is refused.

## F-003 (minor) — MCP-057 deferrals

`[[CORE-147]]` is now linked from CORE-129. The two findings deferred from the
MCP-057 review — F-002 (accepted workflow/job names are literals in
`@kanmer/core`, so a consumer whose CI differs would have every receipt
rejected) and F-010 (`run_id` validated by presence only) — are carried there,
not by this ticket.

## F-007 — CI facts, corrected from `gh run list` / `gh run view` JSON

My round-1 report had the two run ids **inverted** and blamed `regate`. Both are
wrong. The record, from the API:

| Run | Event | Created | Outcome |
|---|---|---|---|
| `33969406401` | `pull_request` (draft PR opened) | 2026-09-05T13:36:51Z | **cancelled** — its `verify` started 13:36:54Z and was cancelled; `kanmer-gate` likewise |
| `33969786183` | `pull_request` (`ready_for_review`) | 2026-09-05T13:44:52Z | superseded it; after I re-dispatched, `verify` ran 13:49:11Z → 13:57:22Z and **passed** (8m11s) |

The cancellation annotation reads *"Canceling since a higher priority waiting
request for `Pull request verification-pull_request-329` exists"* — a
concurrency group keyed on the `pull_request` event for this PR. The cause is
successive `pull_request` events on #329 superseding one another in that group,
not `regate`: **`regate` was `skipped` in both runs**, so it never executed and
could not have cancelled anything. It only ever re-runs an existing run's gate
job. My earlier attribution was a guess presented as a finding, and the JSON
contradicts it.

`kanmer-gate` failed on `NO_REVIEW_RECORD` alone — correct and expected, since
an author must not write `scratch/review.md`. Every other gate check passed.

## Also fixed while here: a stale build stamp of my own making

The first `test:built` after remediation exited 1 with *"build-stamp: refusing —
working tree changed since the stamp was written (dirty digest mismatch)"*. Not
a test failure: I had written the stamp mid-edit and then regenerated the plugin
bundle. CORE-140's guard was doing exactly its job. Re-run in the correct order
— `npm run build` → `npm run plugin:build` → `build-stamp --write` →
`test:built` — and it is green.

## Commands after remediation (exit codes)

| Command | Exit |
|---|---|
| `git merge origin/main` (`58718455`) | 0 — `scripts/` and `packages/mcp-server/scripts/` only, no conflicts |
| `npm run build` | 0 |
| `npm run plugin:build` | 0 |
| `node scripts/build-stamp.mjs --write` | 0 |
| `npm run test:built` | **0** — core 26 files / **1002** tests, GUI 57 / **646**, MCP HTTP **248 pass / 0 fail**, scripts **196 pass / 0 fail** |
| `npm run typecheck` | 0 |
| `node packages/core/scripts/check-browser.mjs` | 0 |
| `node packages/mcp-server/src/smoke.mjs` | 0 |
| `npm run golden` | 0 (20/20 scenarios) |
| `npm run verify:skills` | 0 |
| `npm run verify:docs` | 0 |
| `npm run check:manual` | 0 (22 chapters) |
| `npm run plugin:check` | 0 (41 tools, bundle bytes match) |
| `git status --short` after the final build | empty |

Core test count moved 995 → 1002: +1 parser purity, +3 census stability, +3
waiver gate tests.
