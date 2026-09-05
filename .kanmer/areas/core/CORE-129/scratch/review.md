---
kind: review-attestation
pr: "329"
head_sha: "1aa725eed1ba21b209f9981d8ab7e8881abe9c02"
verdict: needs-changes
reviewer: "independent-reviewer-core-129"
independent: true
plan_hash: "fb465d65e1f58974"
ticket_updated: "2026-09-05T13:47:07.787Z"
board_sha: "9902973186f13a8fb61b2dcb199619549f294a67"
expected_reviewers:
  - "independent-reviewer-core-129"
threads_snapshot: []
findings:
  - id: "F-001"
    severity: blocker
    summary: "parseProofDocument is not a pure function of its input: gray-matter memoises by input string in a module-level cache, and a proof whose YAML frontmatter cannot be parsed reads `invalid` on its FIRST parse in a process and `legacy` on every later parse of the same bytes. The census digest is therefore unstable, so migrate_board's documented dry-run-then-cutover path is refused on its first attempt against the live board, and the attempt that does succeed applies a census that misreports the two unreadable records as ordinary history."
    disposition: open
  - id: "F-002"
    severity: major
    summary: "checklist line 18 and plan Step 2 both assert that strict mode blocks a WAIVED_BY_OPERATOR record, and the checklist box is ticked. The code deliberately does the opposite: a waiver parses to `valid-pass`, and the strict gate's only test is `state !== \"valid-pass\"`, so a waiver satisfies the strict Done gate. The behaviour is defensible and matches FRD-006 R7 and the code comments; the ticked acceptance claim is false and no test pins either reading."
    disposition: open
  - id: "F-003"
    severity: minor
    summary: "MCP-057 findings F-002 (assessReceipt's run_id/attempt/provider/repo left unvalidated) and F-010 (job == \"verify\" and workflow == \"pr.yml\" as literals inside @kanmer/core, which ships to consumer projects) were dispositioned `deferred-to-ticket: CORE-129`. This PR does not touch proof-receipts.ts and addresses neither, so closing CORE-129 would silently drop both deferrals."
    disposition: open
  - id: "F-004"
    severity: minor
    summary: "migrateProofValidation's pre-format-3 refusal is unreachable through migrateBoard: it runs after migrateToV3 in the same call, so detectFormat() has already returned 3. The plan's \"refuse to combine the proof cutover with a format migration\" is met only incidentally, by the digest mismatch a format migration would cause."
    disposition: accepted-risk
    reason: "The safety property the plan wanted is still delivered, by a different mechanism: a censused-then-migrated board yields a different digest, so the cutover refuses without writing. The guard is correct where it is directly tested; only the tool-level path cannot reach it. No unsafe write is possible either way."
  - id: "F-005"
    severity: note
    summary: "The strict refusal text tells the caller Done \"needs a valid `proof-record/2` PASS at the exact merge SHA\", but ProofGateEvidence carries only { state, diagnostics } — the gate holds no merge SHA and does not check one. Exact-SHA binding exists only in reconciliation, which is advisory."
    disposition: accepted-risk
    reason: "An overclaim in a message, not in behaviour: the gate is strictly tighter than before and the SHA binding it names is genuinely enforced one layer out. The store has no route to a GitHub merge SHA at gate time, so the check cannot be added here; the wording should lose the clause when F-001 is fixed."
  - id: "F-006"
    severity: note
    summary: "The `valid-inconclusive` arm of PROOF_RECORD_NOT_AUTHORITATIVE's explanation is unreachable from proofEvidence, which maps valid-inconclusive to { state: \"fail\", failureClass: \"inconclusive\" } and so takes the earlier FAIL branch to VERIFICATION_INCONCLUSIVE."
    disposition: accepted-risk
    reason: "Dead defensive text on a warning-level finding, reachable only by a host assembling evidence by hand. It cannot produce a wrong route; the worst case is a correct refusal under a differently-worded message."
  - id: "F-007"
    severity: note
    summary: "The post-implementation report's \"Hosted checks\" section swaps the two run ids, and the PR comment attributes the cancellations to board pushes and regate. Neither is what happened: run 33969406401 (13:36:51, synchronize) was cancelled at 13:45:05 when the ready_for_review event at 13:44:49 created run 33969786183 in the same concurrency group, and regate cannot cancel anything because it calls `gh run rerun --job` on the existing run rather than creating a new one."
    disposition: accepted-risk
    reason: "A record error, not a defect: every cancellation on this head is ordinary pull_request-event concurrency, exactly as pr.yml documents, and the corrected account is recorded in this attestation. Worth fixing in the report so the next reader is not sent to the wrong run."
  - id: "F-008"
    severity: note
    summary: "The reported census reproduces with a one-ticket drift from ordinary board churn: I read 0 valid / 319 legacy / 2 invalid / 104 absent / 425 total against the reported 0 / 318 / 2 / 105 / 425. Identities match exactly — GUI-133 and GUI-135 invalid, CORE-042 (4698 B) and GUI-141 (1597 B) legacy."
    disposition: accepted-risk
    reason: "The board gained one proof between the implementer's reading and mine; the reported figures were truthful when taken. The invalid count is nonetheless only correct on a cold parse — see F-001."
---

# Review — CORE-129 (round 0, consolidated)

Verdict: **needs-changes**, on one blocker and one major. I did not implement
this ticket. Reviewed at head `1aa725eed1ba21b209f9981d8ab7e8881abe9c02`, PR
[#329](https://github.com/collisionengineers/kanmer/pull/329), plan version 2
(`fb465d65e1f58974`), board `99029731`.

This is a good change. The parser is careful, the report/strict split is the
right shape, the escalation guard is real, and the prose is unusually honest
about its own deviations. Two things stop it: a purity defect that makes the
census — the artefact CORE-141 must take the live cutover decision from —
report different answers on successive reads of the same bytes, and a ticked
acceptance line the code contradicts.

## What I checked, and how

Every changed file read in full in `.worktrees/CORE-129` at the reviewed head.
35 files, 3219 insertions. Scope is clean: no `scripts/verify.mjs`, no
`agents-block-body.mjs`, no `.github/workflows/pr.yml`, no hand-edited
`apps/gui/src/**` (only the generated manual chapter, which `verify:docs` and
`check:manual` both confirm is current), no `package.json` or
`package-lock.json`, so no new dependency.

### Scoped checks in the worktree — all green

| Command | Exit | Result |
|---|---|---|
| `npm ci` | 0 | |
| `npm run build && node scripts/build-stamp.mjs --write` | 0 | |
| `npm run test -w @kanmer/core` | 0 | 26 files / **995 tests** |
| `npm run typecheck` | 0 | core, ui, gui (node + web) |
| `node packages/core/scripts/check-browser.mjs` | 0 | `proof-record` correctly absent from `browser.ts` |
| `node --test …/reconciliation.test.mjs …/step-reconciliation.test.mjs …/check-pr.test.mjs` | 0 | 114 tests, 113 pass, 1 platform skip |
| `node packages/mcp-server/src/smoke.mjs` | 0 | 387/387 |
| `npm run golden` | 0 | 20/20 scenarios |
| `npm run verify:skills` | 0 | ALL CHECKS PASSED |
| `npm run verify:docs` | 0 | generated manual current |
| `npm run check:manual` | 0 | 22 chapters up to date |
| `npm run plugin:build` then `git status --short` | 0 | **empty** — bundle byte-stable |
| `npm run plugin:check` | 0 | **41 tools**, bundle bytes match, isolated handshake lists 41 |

### Mutation tests

Two parser assertions neutralised in place, `proof-record.test.ts` re-run, file
restored (`git status --short` empty afterwards):

- strict-increase / tie check → **1 test failed**
- "the final attempt must be authoritative" → **1 test failed**

Both are load-bearing and genuinely killed by the suite.

### The census, run against a copy of the live board

`cp -r .worktrees/kanmer/.kanmer` into a temp root, SHA-256 of all **3412**
files before and after a `migrate_board` dry run: **byte-identical**. The live
board worktree stayed clean throughout. Reported figures reproduce (F-008), the
two invalid records are exactly GUI-133 and GUI-135 (unparseable YAML — an
unknown escape in a Windows path, and a multiline implicit key), and CORE-042
and GUI-141 are `legacy` at the reported byte lengths, which is the ticket's
Verification item 2 satisfied against the real documents.

I also drove the cutover on throwaway copies. Refusals all behaved and none
wrote: stale digest, `dry_run` with a digest, no digest at all, and repeat.
`setBoard` and `updateBoard` both refuse `PROOF_VALIDATION_ESCALATION_REFUSED`;
relaxing strict → report is allowed at the core layer.

## F-001 — the blocker: the parser is not pure, and the census is not stable

`parseProofDocument` calls `matter(raw)`. `gray-matter` memoises by input
string in a module-level cache. When the YAML throws, gray-matter still leaves
a `{ data: {} }` entry in that cache, so:

```
parse #1: invalid | frontmatter could not be parsed: unknown escape sequence…
parse #2: legacy  | proof is not a schema-2 proof-record — reported as legacy…
parse #3: legacy
after matter.clearCache(), parse: invalid
```

Same bytes, same process, three different answers. The module header's claim
that `parseProofDocument` is "the thin `gray-matter` wrapper" beside a pure
`parseProofRecord` is not true of the wrapper: it carries hidden global state.

The consequence lands squarely on change 3. On a **pristine** copy of the live
board, with every format step a no-op (`alreadyV2`, `alreadyV3`, no stages
added, no identity allocated) and `board.yml` byte-identical before and after:

```
dry digest : proof-census-v1:0e5e6606…   counts { valid 0, legacy 319, invalid 2, absent 104 }
cutover    -> refused: census digest mismatch: this board now reads as proof-census-v1:ffcc83ee…
```

The only two entries that moved are GUI-133 and GUI-135, at identical `bytes`
and identical `sha256`, `invalid` → `legacy`. The under-the-lock re-read is
reporting **drift that did not happen**, and it does so every time from a cold
process.

Running the documented procedure twice is worse than failing:

```
round 1: counts={valid 0, legacy 319, invalid 2, absent 104} -> refused (digest mismatch)
round 2: counts={valid 0, legacy 321, invalid 0, absent 104} -> to=strict changed=true
```

The cutover that succeeds is bound to a census that says **zero invalid
records**, having silently reclassified the two genuinely unreadable proofs as
ordinary pre-schema history. CORE-141's Verification step 3 is "CORE-129 proof
census on a copied board via `migrate_board` dry run; decide the live strict
cutover and record it either way" — that decision would be taken from a reading
the parser produced by accident.

This is not a Done-authority hole: `invalid` and `legacy` both block strict and
both map to reconciliation `invalid`, so nothing is promoted that should not
be. It is a correctness defect in the one artefact this ticket exists to make
trustworthy.

Fix is small — `matter(raw, { cache: false })` — but it needs regression cover
that the current suite cannot provide, because every fixture is parsed once:

- parse the same malformed bytes twice in one test and assert `invalid` both times;
- call `auditProofRecords` twice on a fixture board containing one unparseable
  proof and assert an identical `digest`;
- a dry-run-then-cutover test that succeeds on the **first** attempt.

## F-002 — the major: strict does not block a waiver, and the checklist says it does

`parseProofRecord` maps `WAIVED_BY_OPERATOR` to `state: "valid-pass"` (with
`waived: true`), and `gates.ts` tests only `!proof || proof.state !==
"valid-pass"`. `ProofGateEvidence` is `{ state, diagnostics }` and does not
carry `waived`, so the gate cannot distinguish one even if it wanted to. A
waiver therefore satisfies the strict Done gate.

That is a defensible design and the code says so plainly — "a waiver reaches
`valid-pass`… kanmer-verify has always said a waiver permits the final move" —
and FRD-006 R7 and the amended `kanmer-verify` prose are consistent with it.
Reconciliation correctly declines to *recommend* Done from one.

But checklist line 18 reads "In `strict` mode the proof requirement is
satisfied only by `valid-pass`; legacy, invalid, FAIL, INCONCLUSIVE and
**waived** records block Done" and is ticked, and plan Step 2's negative-case
list says "strict blocks legacy/invalid/FAIL/INCONCLUSIVE/**waived**". Neither
is true, and no test in `gates.test.ts`, `docs.test.ts` or `store.test.ts`
mentions a waiver at all, so the suite pins neither reading.

The behaviour is right; the record is wrong. Correct the checklist line and the
plan's negative case to say what the gate does, and add one test that pins it —
a waived record admitted under strict, and reconciliation still recommending
nothing from it.

## F-003 — MCP-057's deferrals land nowhere

MCP-057's attestation dispositions F-002 and F-010 as `deferred-to-ticket:
CORE-129`, and F-010 in particular ("this repository's workflow and job names
baked into `@kanmer/core`… should become board configuration before any
consumer project writes a receipt") is a real consumer-facing problem. This PR
does not touch `proof-receipts.ts` and CORE-129's own plan never scoped either
— it scoped only the `head_sha` ≠ `merged_sha` rule, which is delivered. File
one follow-up ticket, link it from CORE-129, and the deferral survives.

## The four other required changes, verified

**1 — the parser.** Every negative case in the plan's Step 1 list has a table
entry: schema/kind/environment/`merged_sha`/`verified_at`/empty-attempts,
non-object attempts, both enums, missing summary, non-authoritative final
entry, partial and contradictory process evidence, PASS with a non-zero exit,
FAIL with exit 0, FAIL with `inconclusive`, INCONCLUSIVE with the wrong class,
PASS carrying a class, timestamp tie and reversal, `verified_at` drift,
top-level result and failure-class drift, a waiver without operator identity, a
mismatched receipt, a non-array `receipts`. 53 tests. I tried to break it
beyond that list: uppercase `merged_sha` and uppercase receipt `head_sha` are
both refused by the anchored lowercase-hex pattern; a `schema` this build does
not recognise is `invalid` rather than buying silence as `legacy`; `receipts[]`
really does go through MCP-057's `parseProofReceipts` and is never
re-implemented; unknown top-level keys are preserved on `unknown` and reported,
unknown attempt keys refused. `attempts[i].exit_code` uses an `in` check so an
absent key is refused rather than read as the manual form. INCONCLUSIVE with
exit code 0 is accepted — correct, since inconclusiveness is about
interpretation, not exit status. Legacy records are never rewritten and never
promoted; `WAIVED_BY_OPERATOR` handling matches the amended verify skill.

Two smaller observations, neither worth a finding: unknown-key diagnostics are
dropped on the `invalid` path (only `errors.sort()` is returned), and
`instantOf` accepts anything `Date.parse` accepts, so a non-ISO but parseable
timestamp passes a check whose message says ISO-8601.

**2 — board policy.** The zod addition is additive and `.optional()`;
`defaultBoardConfig()` writes strict; absence resolves `{ report, default }`.
`get_status.proofValidation` and `list_board.proofValidation` both report
`{ mode, source }`. The escalation guard is on both `setBoard` and
`updateBoard`, which is where `update_column` funnels, and I confirmed both
refuse by driving them. **The GUI Settings save cannot escalate either**: it
reaches the same `store.setBoard` through `ipcMain.handle(CH.setBoard)`, so the
guard applies, and its `draft` is a `structuredClone` of the fetched board
mutated field-wise, so an unknown-to-the-form `proofValidation` round-trips
rather than being stripped. Deviation 7's claim that "there is no MCP path to
relax strict → report; only the GUI Settings save can do it" is *not* accurate
— the GUI has no control that writes the field, so in practice there is no
in-product relax path at all, only a hand edit of `board.yml`. That is
acceptable for 0.4.2 (the intended direction is report → strict, the core layer
already permits the reverse, and the field is one line of YAML), but the
sentence should be corrected.

**3 — census/cutover.** Verified empirically above: the dry run wrote nothing
across 3412 files; the digest binds the parser version, and per-ticket
identity, stage, archived flag, raw size, raw SHA-256 and parsed state; every
refusal path refuses without writing; an already-strict board is idempotent;
proofs, tickets and activity are never edited. Only `proof/proof.md` is read,
which is the right call — counting other markdown under `proof/` would report a
stricter board than the one enforced. Subject entirely to F-001, which is what
makes the digest untrustworthy in the first place.

**4 — gates and reconciliation.** `gateReport` memoises one read and parse per
report, and `gateReportFromExecutionAuthority` reads from the packet's own
inventory so the packet's answer comes from the bytes the packet reports —
that's a nice detail. In **report** mode, which is the live board's mode, no
move behaviour changes: the strict branch is never entered, `out.satisfied` is
never touched, and the finding goes to `warning`, the module's existing
non-blocking channel. The visual advisory now appends rather than assigns, so
neither warning can swallow the other, and it still runs after the hard check.
`RequirementStatus.detail` is a new field, so nothing that reads `warning`
changes shape — `gates.test.ts` asserts the refusal reason lands in `detail`
and never in `warnings`. Existing Done creation and backfill remain ungated.
The 995-test core suite and the 387-check smoke both pass unchanged in report
mode, which is the proof that today's boards are undisturbed.

MCP reconciliation's own decoder and `validTimestamp` are gone and
`proofEvidence` delegates to the core parser, so the gate and the inspector can
no longer disagree about one document. `PROOF_RECEIPT_REJECTED` still fires end
to end through the real decoder on both the PASS and FAIL/implementation routes
(`reconciliation.test.mjs` asserts the finding *and* the
`receipt job must be "verify"` text). Deviation 3 is truthful:
`PROOF_RECEIPT_SHA_MISMATCH` is no longer reachable through this build's
decoder because the parser invalidates a self-contradicting receipt first, and
the finding is correctly retained and tested at `reconcileEvidence` level
because it answers a different question — receipt versus the **live** PR merge
SHA — that must hold for evidence any host assembles. The outcome stays
truthful and routed: legacy and invalid both reach `state: "invalid"`, produce
`PROOF_RECORD_NOT_AUTHORITATIVE` and `none()`, and never a Done recommendation.

**Deviation 1 — legacy yields no Done recommendation regardless of mode — is
acceptable for 0.4.2, and should not be made report-mode-tolerant.** The
argument in the code is the right one: `report` relaxes the gate a human passes
through, not the advice a machine gives, and the defect that motivated this
ticket was a machine acting on an unvalidated record. It does not violate "do
not retroactively rewrite or reopen": no proof byte changes, no ticket moves,
no stage is reopened, and `reconcile_ticket` stays read-only. What changes is
that `reconcile_ticket` stops *recommending* `MOVE_TO_DONE` for a Verifying
ticket whose proof predates schema 2 — and today the live board has exactly one
ticket outside Done and none in Verifying, so the practical blast radius is
nil. A human may still move the ticket; they are now told why the machine will
not. Making it mode-tolerant would reintroduce the exact silence that let
GUI-141 be moved. Dispositioned **accepted**, with the note that the verify
skill should keep saying a legacy proof is readable evidence for a person.

**5 — prose.** ADR-0011's amendment is a genuine argument for a bounded second
content reader with two stated limits, not a rubber stamp. FRD-002 P5a, FRD-006
R7 plus the "Report and strict" section and three new acceptance criteria, the
two manual chapters, AGENTS.md §4/§5, and the four skills all match the code as
implemented — including the waiver, where the skills and FRDs are right and only
the checklist is wrong (F-002). `kanmer-verify` correctly splits the two attempt
shapes and drops the ambiguous `command: "<exact command or manual check>"`
invitation (deviation 4, disclosed and right). Deviation 2's removal of
`NOT_APPLICABLE` is disclosed and confined to schema 2. `verify:skills`,
`verify:docs` and `check:manual` are green, the roster is 41, and the bundle
byte-matches a fresh build.

## CI at this head

Head `1aa725eed1ba21b209f9981d8ab7e8881abe9c02`, run **33969786183**
(`pull_request` / `ready_for_review`, 13:44:52):

| Job | Id | State |
|---|---|---|
| `verify` | 101317718998 | **success** (8m11s) |
| `kanmer-gate` | 101316678986 | failure — `NO_REVIEW_RECORD` only, self-referential and discharged by this record once the board is pushed and the gate re-runs |
| `regate` | — | skipped (PR event) |

**Cancellation cause — branch pushes and the ready-for-review transition, not
board pushes.** Run `33969406401` was created at 13:36:51 by the last
`synchronize` (five commits landed 13:08–13:34, each superseding the previous
run) and was cancelled at 13:45:05 when the **`ready_for_review`** event at
13:44:49 created run `33969786183` in the same concurrency group —
`pr.yml`'s group keys on `github.event_name` and the PR number and carves out
only `edited`, so `ready_for_review` shares the group and cancels. `regate`
cannot be the cause: it calls `gh run rerun --job` on the *existing* run rather
than creating one, which is also why `33969406401` shows `github-actions[bot]`
as its triggering actor and a separately-cancelled `kanmer-gate` job at
13:45:41. Every cancellation on this head is the ordinary, documented
concurrency behaviour. The report's account is inverted (F-007).

## Threads

GitHub GraphQL at this head: `reviewThreads` 0, `reviews` 0. `threads_snapshot:
[]` is the truthful value. Two issue comments exist, both by the author (the
commit-list note and the CI note); neither is a review thread and neither is a
gate. No bot thread was posted, and a bot is never a gate. `review_round` is 0,
so this consolidated review raises every finding I will raise on this PR.

I confirmed the commit-list note: `git diff --name-only main...HEAD` is 35
files and contains no `proof-receipts.*`, so MCP-057's content contributes
nothing to the diff and appears only in the commit list.

## Blocking changes

1. **F-001** — make `parseProofDocument` pure (`matter(raw, { cache: false })`)
   and add the three regression tests above, so a cold and a warm process read
   one board identically and the first cutover attempt succeeds.
2. **F-002** — correct checklist line 18 and the plan's Step 2 negative case to
   state that a waiver satisfies the strict gate, and add a test pinning it on
   both the gate and reconciliation sides.
3. **F-003** — file one follow-up ticket for MCP-057 F-002 and F-010 and link
   it from CORE-129.
4. **F-007** and deviation 7's wording — correct the run ids and the
   cancellation account in the post-implementation report, and the "only the
   GUI Settings save can relax it" sentence.

## BEHIND

The PR is `mergeStateStatus: BEHIND` (`main` is `58718455`, carrying CORE-144
and CORE-145, which touch only `scripts/` and
`packages/mcp-server/scripts/` — no file this ticket owns). Review the
remediation and then `gh pr update-branch`; I will re-bind this attestation to
the new head as a delta.

## Residual risk

Beyond the dispositioned notes: the strict gate has no exact-merge-SHA binding
of its own (F-005), so a valid PASS record naming any merge SHA satisfies it —
the binding is reconciliation's, and reconciliation is advice. That is a
deliberate boundary and is the same status CORE-133's
`PROOF_MERGE_SHA_MISMATCH` already has, but it means "strict" is a statement
about the record's internal consistency rather than about the commit. Worth
stating plainly in FRD-006 before anyone reads `strict` as more than it is.

I did not merge, did not move the ticket, and did not push the PR branch.
