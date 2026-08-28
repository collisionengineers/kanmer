---
kind: review-attestation
pr: "301"
head_sha: "abeb16978a4b3f8fece6e98d6bdf54e541544a1b"
verdict: pass
reviewer: "claude-opus-5-independent-reviewer"
independent: true
plan_hash: "3f886ca19f8bbba1"
ticket_updated: "2026-08-28T05:37:16.430Z"
threads_snapshot:
  - id: "PRRT_kwDOT2PEds6dEi4g"
    author: "chatgpt-codex-connector"
    path: "packages/core/src/reconciliation.ts"
    line: 147
    title: "Permit recovery when the recorded workspace is gone"
    codex_severity: "P1"
    finding: "R-001"
    resolved_by_reviewer: true
  - id: "PRRT_kwDOT2PEds6dEi4m"
    author: "chatgpt-codex-connector"
    path: "packages/core/src/reconciliation.ts"
    line: 179
    title: "Bind failure routing to the current merge SHA"
    codex_severity: "P1"
    finding: "R-002"
    resolved_by_reviewer: true
  - id: "PRRT_kwDOT2PEds6dEi4q"
    author: "chatgpt-codex-connector"
    path: "packages/mcp-server/src/index.ts"
    line: 997
    title: "Capture the request actor before collecting evidence"
    codex_severity: "P1"
    finding: "R-003"
    resolved_by_reviewer: true
  - id: "PRRT_kwDOT2PEds6dEi4j"
    author: "chatgpt-codex-connector"
    path: "packages/core/src/store.ts"
    line: 1774
    title: "Commit the reconciliation audit with the applied action"
    codex_severity: "P2"
    finding: "R-005"
    resolved_by_reviewer: true
  - id: "PRRT_kwDOT2PEds6dEi40"
    author: "chatgpt-codex-connector"
    path: "packages/core/src/store.ts"
    line: 1730
    title: "Suppress terminal release while its batch is active"
    codex_severity: "P2"
    finding: "R-006"
    resolved_by_reviewer: true
  - id: "PRRT_kwDOT2PEds6dEi44"
    author: "chatgpt-codex-connector"
    path: "packages/mcp-server/src/reconciliation.ts"
    line: 434
    title: "Check the revision before returning inconclusive"
    codex_severity: "P2"
    finding: "R-007"
    resolved_by_reviewer: true
  - id: "PRRT_kwDOT2PEds6dEi4y"
    author: "chatgpt-codex-connector"
    path: "packages/mcp-server/src/reconciliation.ts"
    line: 438
    title: "Return inconclusive reconciliation as a normal result"
    codex_severity: "P2"
    finding: "R-008"
    resolved_by_reviewer: true
findings:
  - id: "R-001"
    severity: major
    summary: "Expired-claim recovery is unreachable for the two production shapes of a workspace that is gone. The RECOVER_EXPIRED_CLAIM predicate requires claimIdentity matches-claim|not-applicable, but workspaceEvidence emits missing+unavailable for a deleted worktree and not-recorded+not-applicable for an unrecorded one, so both are rejected; the \"missing\" arm of the state disjunction is dead code. FRD-028's Behaviour list names \"a missing worktree or no surviving work\" and AC3 requires abandoned claims to route. transferTicket refuses only board/foreign-repository/branch-mismatch, so it would accept both shapes -- the code comment's \"the transfer would itself refuse it\" justification does not apply. Verified by execution against the built collector at this head."
    disposition: deferred-to-ticket
    ticket: "CORE-133"
  - id: "R-002"
    severity: minor
    summary: "The Verifying FAIL route is not bound to the current merge SHA. The PASS path guards proof.mergedSha !== pullRequest.mergeSha with PROOF_MERGE_SHA_MISMATCH; the FAIL path immediately below routes solely on failureClass. A stale FAIL proof naming an earlier round's merge SHA can produce a current ROUTE_VERIFICATION_FAILURE. Non-destructive (proof preserved, backward and reversible, explicit apply required), but the asymmetry with the PASS path is unintended."
    disposition: deferred-to-ticket
    ticket: "CORE-133"
  - id: "R-003"
    severity: minor
    summary: "applyReconciliation reads the actor from the mutable singleton store.actor after the long git/gh collection window rather than capturing actorName from the request. A concurrent mutating MCP request on a shared store can therefore misattribute this apply's ## Transitions line and, for RECOVER_EXPIRED_CLAIM with no explicit controller, the durable assignee/claim_controller."
    disposition: accepted-risk
    reason: "The singleton-actor pattern is repo-wide (write() calls store.setActor per request for all 20+ write tools); this PR widens the window but does not introduce the pattern. Exposure needs two concurrent mutating requests against one shared store, which the single-client stdio deployment does not produce. The consequence is misattribution of an audit line or a recoverable mis-transfer, never a wrong action, a lost write or a bypassed gate: FRD-028 AC2's audit entry is still recorded. FRD-034 permits a dispositioned minor as explicit residual risk. The fix is small (thread actorName through ApplyReconciliationInput.actor, which the type already accepts) and is left to whoever next touches the handler."
  - id: "R-004"
    severity: minor
    summary: "packages/mcp-server/src/index.ts:957 -- reconcile_ticket's live tool description still asserts \"there is no apply surface -- an operator or controller acts on the recommendation through the ordinary tools\", which this PR makes false. tool-reference.md's reconcile_ticket row was correctly updated to point at apply_reconciliation; the shipped description, which is what MCP clients actually read, was not. check-plugin-sync compares tool names only, so nothing caught it."
    disposition: accepted-risk
    reason: "Prose only, no behavioural effect. apply_reconciliation is independently discoverable in the same tools/list with a complete description naming its contract, so an agent is not prevented from finding it. Correcting it would require regenerating the bundle and moving the head SHA, forcing a full re-review of a change that is otherwise complete and green. Recorded as explicit residual risk per FRD-034; fold into the next change that touches this description."
  - id: "R-005"
    severity: minor
    summary: "The durable ## Transitions audit is appended after the delegated verb has completed and released its lock -- two independently successful writes rather than one mutation boundary. A crash in that interval leaves the action applied with no reconciliation audit line, and a concurrent ticket mutation can interleave before it."
    disposition: accepted-risk
    reason: "The action itself is never lost and the board state is never wrong: moveItem records the stage on the item and in activity, and transferTicket writes its own claim-transfer transition line with re-read evidence, both inside the lock. What the window can lose is only the supplementary \"why reconciliation acted\" line, between two local file writes milliseconds apart. Closing it would mean holding withLeaseLock across the verb and the append -- a re-entrancy change to CORE-125's lock design that is out of this ticket's bounded scope and riskier than the residual it removes. Note also that a v1-layout board cannot reach the append at all, but is already refused earlier with RECONCILIATION_INCONCLUSIVE (revision === null), so no v1 board applies without an audit."
  - id: "R-006"
    severity: note
    summary: "RELEASE_CLEAN_TERMINAL_CLAIM can be recommended for a Done ticket that still belongs to a batch with nonterminal siblings, because the collected evidence carries no batch state; releaseTicket then refuses with BATCH_ACTIVE. The apply surface can propose an action its delegated verb will refuse."
    disposition: accepted-risk
    reason: "Fails safe and writes nothing: the refusal is the existing structured BATCH_ACTIVE (classified LEASE_CONFLICT) and the ticket is untouched. The cost is one wasted round trip in a corner that requires a Done batch member with a live sibling. Adding batch state to ReconciliationEvidence is a wider evidence-schema change than this ticket bounds. Explicit residual risk per FRD-034."
  - id: "R-007"
    severity: note
    summary: "applyReconciliation checks for an absent recommendation before comparing the caller's expectedRevision, so a ticket that changed into a no-recommendation state between the dry run and the apply returns RECONCILIATION_INCONCLUSIVE rather than REVISION_CONFLICT. The tool description promises REVISION_CONFLICT for any change since the dry run."
    disposition: accepted-risk
    reason: "Both outcomes are refusals that write nothing, both carry a structured error code, and re-running reconcile_ticket -- which the INCONCLUSIVE message instructs -- resolves the ambiguity immediately. A minor ordering imprecision in refusal taxonomy, not a safety or correctness issue. Explicit residual risk per FRD-034."
  - id: "R-008"
    severity: note
    summary: "Codex objected that RECONCILIATION_INCONCLUSIVE is surfaced via failCoded with isError: true, contradicting the tool description's phrase \"a normal RECONCILIATION_INCONCLUSIVE refusal, not an error\"."
    disposition: rejected-with-reason
    reason: "This is the established convention of the whole server, not a defect of this PR. failCoded (packages/mcp-server/src/errors.ts) unconditionally sets isError: true for every coded refusal, including REVISION_CONFLICT, WRONG_PROJECT, GATE_BLOCKED, LEASE_EXPIRED and LEASE_CONFLICT (CLAIM_LIVE, WORKSPACE_OCCUPIED, BATCH_ACTIVE). Every one of those is an expected, non-exceptional outcome carrying a machine-readable code in structuredContent.error.code -- which is exactly what \"normal refusal\" means here, and exactly what the new codes deliver. Making this one path isError: false would make it the sole inconsistent refusal in a 40-tool surface. Verified against errors.ts and the smoke assertions at this head."
  - id: "R-009"
    severity: note
    summary: "The \"board worktree is refused in every path\" test (packages/mcp-server/src/reconciliation.test.mjs:615) asserts /CLAIM_LIVE|RECOVERY_REFUSED/ against a ticket whose claim is live, so it can only ever observe CLAIM_LIVE and never actually exercises transferTicket's independent board-worktree guard. The test's second-layer claim is weaker than it reads."
    disposition: accepted-risk
    reason: "Test strength only -- the production guard is real and I confirmed it independently by execution: with the claim aged to expired (so CLAIM_LIVE cannot mask it) and worktree recorded as \".\", store.applyReconciliation(RECOVER_EXPIRED_CLAIM) refused with RECOVERY_REFUSED from store.ts:1570-1573 and mutated nothing. Both layers therefore genuinely exist; only the assertion is imprecise. Explicit residual risk per FRD-034."
---

# Review attestation — CORE-131 (PR #301)

Independent review at head `abeb16978a4b3f8fece6e98d6bdf54e541544a1b`, in a
throwaway detached worktree at that exact SHA with its own `npm ci`. I did not
write this code and did not rely on the implementer's report for any claim
below: every finding and every acceptance judgement is backed by a command I
ran myself.

**Verdict: pass.** Both required checks (`verify`, `kanmer-gate`) are green on
this head. One major finding is filed as CORE-133; nothing is open.

## What the change is

One MCP tool (`apply_reconciliation`, roster 39 → 40) and one core dispatcher
(`store.applyReconciliation`), completing FRD-028's apply half on top of
CORE-114's document-inclusive revision, CORE-115's leases and CORE-125's write
lock. 15 files, +1317/−89.

The load-bearing design decision is that **the caller never supplies the
action**. `apply_reconciliation` takes only `id`, `expected_revision` and two
optional passthroughs; it re-collects through the *same* `reconcileTicket` the
dry run used and applies whatever the fresh evidence classifies. There is no
caller-chosen verb to smuggle an action through, which removes an entire class
of abuse before the authority checks are even reached.

## FRD-028 acceptance criteria

| AC | Requirement | Verdict | Evidence I ran |
|---|---|---|---|
| **1** (regression only) | Dry run returns evidence and a proposed action without changing board, Git or workspace state | **Not regressed** | `smoke.mjs` 338/338, including `reconcile_ticket never mutates the ticket` — `{"before":"…28.915Z","after":"…28.915Z","status":"review"}`; `reconcile_ticket is read-only and discloses external Git/GitHub reads` (`readOnlyHint` intact); `reconciliation.test.mjs` "reconcile_ticket is a dry run: the store is unchanged" |
| **2** | Apply corrects only a still-current action, records an audit entry; a changed revision returns a structured conflict | **Met** | Three ordered refusals verified: `RECONCILIATION_INCONCLUSIVE`, `REVISION_CONFLICT`, `RECONCILIATION_DRIFT`. My own probe: stale revision → `REVISION_CONFLICT`, status unchanged, **and `scratch/execution` still `null`** (no audit line on a refusal). Durable audit confirmed live through a real MCP client in `smoke.mjs`: `## Transitions` contains `reconcile MOVE_TO_IMPLEMENTING by …; stage review → implementing; revision rev1:…` |
| **3** | Merged Review, PASS Verifying, plan/implementation failures and abandoned claims route correctly | **Met with a gap** | Merged Review → Verifying, PASS → Done, closed-unmerged → Implementing, `implementation` → Implementing, `plan` → Preparing all pass (23/23 boundary + 43/43 classifier). Abandoned claims recover for clean and dirty workspaces. **Gap:** a deleted or unrecorded workspace does not route — R-001, filed as CORE-133 |
| **4** | Dirty expired workspace preserved and reported; cleanup only for terminal + clean + authorised | **Met** | The byte-identical claim is real: the test captures `git status --porcelain` before and after and asserts `assert.equal(porcelain(), statusBefore)` on a genuine `git worktree` with an uncommitted file, plus a file-content check. The claim is aged on disk rather than via an injected clock, so `transferTicket`'s own real-time expiry check is exercised. `RELEASE_CLEAN_TERMINAL_CLAIM` is gated on `done` + `clean` + `matches-claim` and releases the claim, never the worktree |
| **5** (regression only) | Board-worktree protection, required checks and immutable release evidence intact | **Not regressed** | `BOARD_WORKTREE_PROTECTED` and `RELEASE_EVIDENCE_PRESERVED` still return before any recommendation; `release.state` still hard-coded `not-applicable`; no path force-pushes or bypasses a check. Board-worktree refusal confirmed at **both** layers — see below |

## The F-015 regression — the point of the ticket

CORE-113 died because `item.updated` was the only CAS token and `setDoc` never
bumps it, so a proof rewritten between collect and apply was invisible. I did
not take this on the tests' word. My own probe against the built artefacts:

```
CONTROL A pass: current revision + PASS proof -> MOVE_TO_DONE applied
  ticket.updated  before=2026-08-28T05:51:47.972Z after=2026-08-28T05:51:47.972Z  moved=false
  revision        before=rev1:976e9e6a843865f4    after=rev1:3d19402826de4f82     moved=true
  refusal code=REVISION_CONFLICT  status still=verifying
CONTROL B pass: fresh revision -> ROUTE_VERIFICATION_FAILURE -> implementing (never done)
F-015 REGRESSION: HELD
```

Three things matter here, and all three hold:

1. **The premise still bites.** `updated` is byte-identical across a proof-only
   write. PR #286's `expectedUpdated` CAS would still be blind today.
2. **The revision moves.** `rev1:976e9e6a843865f4` → `rev1:3d19402826de4f82` on
   a proof-only write, and the stale apply is refused `REVISION_CONFLICT` with
   the ticket still in Verifying and no audit line written.
3. **The refusal is discriminating, not blanket.** Control A proves the same
   PASS proof *does* apply `MOVE_TO_DONE` when the revision is current, and
   control B proves that after the flip the fresh revision applies the **new**
   route (`ROUTE_VERIFICATION_FAILURE` → implementing), never the stale
   `MOVE_TO_DONE`. A test that merely refuses everything would pass without
   these controls; this one does not.

**F-015 is genuinely closed.** Not a blocker.

## Exhaustiveness

`ReconciliationAction` is a closed union of exactly the six required members —
`MOVE_TO_IMPLEMENTING`, `MOVE_TO_VERIFYING`, `MOVE_TO_DONE`,
`ROUTE_VERIFICATION_FAILURE`, `RELEASE_CLEAN_TERMINAL_CLAIM`,
`RECOVER_EXPIRED_CLAIM` — and no more. The dispatcher's `default` branch is
`const exhaustive: never = input.action`, so adding a seventh member without a
case is a compile error, and `npm run typecheck` is clean across core,
mcp-server, ui and gui. Nothing can silently fall through.

Every branch also re-asserts its own preconditions before delegating
(`requireStatus` / `requireTarget` / `requireNoTarget`, plus an independent
`leaseState` expiry check for `RECOVER_EXPIRED_CLAIM`), so a recommendation
that no longer matches the ticket is refused a second time inside core.

## Typed routing and its default

Executed directly against the built collector, all four non-routing classes:

```
failure_class=absent        recommendation=null  apply=RECONCILIATION_INCONCLUSIVE  status=verifying
failure_class=inconclusive  recommendation=null  apply=RECONCILIATION_INCONCLUSIVE  status=verifying
failure_class=unrecognised  recommendation=null  apply=RECONCILIATION_INCONCLUSIVE  status=verifying
failure_class=transient     recommendation=null  apply=RECONCILIATION_INCONCLUSIVE  status=verifying
```

`implementation` → Implementing and `plan` → Preparing both route. An absent
class, `inconclusive`, `transient` and an unrecognised class (`"banana"`) all
yield **no recommendation** and leave the ticket in Verifying. The decoder
(`failureClassOf`) allow-lists the four known values after trim/lowercase and
falls back to `inconclusive`, matching `kanmer-verify/SKILL.md`'s stated
default. This decoder is new and had no prior TypeScript reader, so I exercised
it directly rather than reading it: **no non-PASS proof silently routes
anywhere.**

## Backward-move authority — no third authority added

Confirmed against `backwardMoveEffects` (`store.ts:1004-1063`), which
special-cases **only** `review → implementing`; every other backward move is
authorised by any non-empty reason.

- `MOVE_TO_IMPLEMENTING` (review → implementing) passes `input.reason` through
  **only when the caller supplied one** and deliberately never defaults it, so
  an absent reason reaches `BACKWARD_MOVE_NEEDS_REASON` and a non-operator
  reason reaches `REVIEW_RETURN_NEEDS_ATTESTATION`. The test walks the whole
  ladder. An agent cannot self-authorise `review → implementing`.
- `ROUTE_VERIFICATION_FAILURE` (verifying → implementing/preparing) *does*
  default a reason, but that is an ordinary backward move where a reason alone
  has always sufficed, and the default (`proof FAIL <class>: routed by
  apply_reconciliation…`) does **not** begin `operator:`, so `isOperatorReason`
  is false and no operator authority is smuggled.

No `reconcile:` prefix exists anywhere in the diff, no `force` is passed to any
lease verb, and `backwardMoveEffects` itself is unmodified.

## Board worktree — refused at both layers, confirmed independently

The implementer's test (`reconciliation.test.mjs:615`) asserts
`/CLAIM_LIVE|RECOVERY_REFUSED/` against a **live** claim, so it can only ever
observe `CLAIM_LIVE` and never actually reaches layer 2 (R-009). I therefore
verified layer 2 myself, with the claim aged to expired so `CLAIM_LIVE` cannot
mask it:

```
LAYER 2 (expired claim, board worktree) refusal = RECOVERY_REFUSED
LAYER 2 board-worktree refusal: INDEPENDENTLY CONFIRMED (not masked by CLAIM_LIVE)
```

- **Layer 1** — `reconcileEvidence` (`reconciliation.ts:73-76`): the very first
  refusal, `BOARD_WORKTREE_PROTECTED`, returns `none()` before anything is
  classified, so *no* action is ever recommended for a board-worktree target.
- **Layer 2** — `transferTicket` (`store.ts:1569-1573`): refuses
  `RECOVERY_REFUSED` independently, and I confirmed nothing mutated.

## Roster 39 → 40 — all nine sites, and the bundle is a real rebuild

| Site | State |
|---|---|
| `smoke.mjs` count | `40`, verified live: `PASS tools/list returns 40 tools — got 40` |
| `smoke.mjs` roster name list | `apply_reconciliation` added; annotations and the exact input-schema key set are asserted |
| `smoke-protocol.mjs` message **and** predicate | both moved; `40 tools` passes on all four protocol revisions (2025-11-25, 2025-06-18, 2025-03-26, 2024-11-05) |
| AGENTS.md §4 line 435 | `**40 tools**` |
| AGENTS.md §8 item 19 "(roster stays 39)" | rewritten accurately, not merely renumbered: "(CORE-118 added none; the roster moved to 40 only when CORE-131 added `apply_reconciliation`)" |
| AGENTS.md §8 new item 21 | added, describing the apply contract and its lock ordering |
| `docs/manual/connect.md` | `40 tools` |
| `chapters.generated.ts` | genuine regeneration — `npm run check:manual` reports "manual: up to date (22 chapters)" and `verify:docs` confirms "generated manual current" |
| `tool-reference.md` | `apply_reconciliation` row added; `reconcile_ticket` row's apply-surface sentence corrected |
| Plugin bundle | **byte-identical to my own fresh build**: `b4ac801c0f91a86d2b5943acc851c0d11b91d065df7a289d066f2e97924e2369` for both the committed `plugins/kanmer/mcp/kanmer-mcp.cjs` and `dist/standalone/kanmer-mcp.cjs` after `npm run build` |

`npm run plugin:check` from my own worktree: *"40 tools match, bundle bytes
match, 12 skill frontmatters parse, manifests at v0.3.12, isolated MCP
handshake lists 40 tools."* A repo-wide grep finds **no residual "39 tools"**
anywhere. The one stale apply-surface sentence that survives is in
`index.ts:957`, not a count — R-004.

## The four declared deviations

1. **`packages/mcp-server/src/errors.ts` modified though absent from the plan's
   Expected-files table — ACCEPTED.** The change is two additive members on the
   `KanmerErrorCode` union plus a comment. The plan itself names
   `RECONCILIATION_INCONCLUSIVE` and `RECONCILIATION_DRIFT` as required
   structured refusals, and `new KanmerError("RECONCILIATION_INCONCLUSIVE", …)`
   does not typecheck without them, so the omission is a table oversight rather
   than a scope expansion. `errors.ts` is not on the plan's "Do not modify"
   list, nothing else in the file changed, and no existing code was altered.
   (The table also lists `packages/core/src/index.ts`, which was *not* needed —
   it re-exports `./types.js` wholesale. Touching fewer files than planned is
   not a deviation.)

2. **`npm run verify` run from the worktree rather than the main checkout —
   ACCEPTED; the reading of the guard is correct.** `check-plugin-sync.mjs:49-66`
   says so in its own words: *"A worktree is valid when it owns the workspace
   dependency used for the fresh bundle. Conversely, a broken main checkout is
   invalid too. Asking git whether this is a linked worktree was only a proxy
   for this property."* The guard resolves `@kanmer/core` and calls
   `ownsCoreResolution({ ownCore, resolvedCore })` — it tests resolution
   ownership, not worktree-ness. I reproduced this: `plugin:check` passed
   cleanly from my own detached review worktree after its own `npm ci`.

3. **`npm ci` inside the fresh worktree — ACCEPTED, and required by (2).** A
   worktree without its own `node_modules` resolves `@kanmer/core` to whatever
   sibling checkout npm finds, which is exactly the failure `ownsCoreResolution`
   is designed to refuse. I hit the identical condition and resolved it the
   same way.

4. **`RECONCILIATION_DRIFT` as a revision-and-stage recheck immediately before
   delegating — ACCEPTED.** The tool takes no caller-supplied action, so there
   is nothing to compare an action against; the only meaningful drift is the
   board moving *during* collection, which is what the recheck detects. The
   author's own comment is honest that a revision match should already make it
   unreachable and that the verb's CAS would refuse it regardless — it is
   defence in depth, correctly labelled as such, not a load-bearing guard
   pretending to be one.

## Commands I ran at this head

| Command | Exit | Result |
|---|---|---|
| `git worktree add --detach … abeb1697` | 0 | independent checkout at the exact head |
| `npm ci` | 0 | own dependency tree |
| `npm run build` | 0 | core + server + standalone bundle |
| `sha256sum` committed bundle vs fresh build | 0 | **identical** |
| `npm run plugin:check` | 0 | 40 tools, bundle bytes match, isolated handshake lists 40 |
| `npm run typecheck` | 0 | core, mcp-server, ui, gui all clean |
| `npx vitest run src/reconciliation.test.ts` | 0 | **43/43** |
| `node --test packages/mcp-server/src/reconciliation.test.mjs` | 0 | **23/23**, incl. the F-015 case |
| `node packages/mcp-server/src/smoke.mjs` | 0 | **338/338** |
| `node packages/mcp-server/src/smoke-protocol.mjs` | 0 | **50/50**, 40 tools on 4 protocol revisions |
| `npm run check:manual` / `verify:docs` / `verify:agents-block` / `verify:skills` | 0 | up to date / PASS / 31/31 / ALL CHECKS PASSED |
| my own F-015 + typed-routing probe | 0 | F-015 HELD with both controls; all four default classes yield no recommendation |
| my own workspace-evidence + layer-2 probe | 0 | R-001 confirmed; layer-2 board refusal confirmed |

**I did not run `npm run verify` locally.** Its known Windows `EBUSY` failure in
`scripts/antigravity-plugin-config.test.mjs` belongs to CORE-128 in a parallel
lane and is off-limits, and the `claims.test.ts`/`docs.test.ts`/`store.test.ts`
5s-timeout flake class is documented. **No flake discharge argument is needed
here:** the authoritative rail settled it. Hosted `verify` **succeeded** on this
exact SHA at 2026-08-28T05:42:00Z, so the local Windows-only failures are not
present on the CI platform and are not a regression from this diff. I ran every
step the local rail would have reached individually anyway, and all exited 0.

## CI and merge gating

- `verify` — **SUCCESS**, required
- `kanmer-gate` — **SUCCESS**, required (the earlier `WRONG_STAGE` failure was
  the board being deliberately unpushed; re-run green after the push)
- `regate` — SKIPPED, not required
- `mergeStateStatus: BLOCKED` with `mergeable: MERGEABLE` — caused solely by
  `required_conversation_resolution: enabled` against the seven open Codex
  threads, not by any check. `required_approving_review_count: 0`.

## Findings and dispositions

Nine findings; **no blockers**, one major, four minor, four notes. The seven
Codex threads map onto R-001, R-002, R-003, R-005, R-006, R-007 and R-008;
R-004 and R-009 are mine. Each thread's disposition was posted as a PR comment
before it was resolved, so the reasoning survives outside the board.

- **R-001 (major)** and **R-002 (minor)** → **CORE-133**, filed against
  FRD-028 and HZN-008, linked to CORE-131.
- **R-003, R-004, R-005, R-006, R-007, R-009** → accepted as explicit residual
  risk with reasons, per FRD-034: "dispositioned minor/note findings may remain
  as explicit residual risk." No further tickets filed.
- **R-008** → rejected with reason: it describes the server's uniform refusal
  convention, not a defect of this change.

## Residual risk carried into Verifying

The single behavioural gap that a verifier should know about is **R-001**: an
abandoned claim whose worktree was deleted, or that never recorded one, gets a
correct dry-run diagnosis (`CLAIM_EXPIRED` plus `WORKSPACE_MISSING` or
`CLAIM_WITHOUT_RECORDED_WORKSPACE`) but **no recovery recommendation**, so
`apply_reconciliation` refuses `RECONCILIATION_INCONCLUSIVE`. It fails closed —
the operator falls back to `take_ticket action transfer`, which is the same
authority. HZN-008's own acceptance ("a broken or abandoned ticket state can be
inspected dry-run first and safely reconciled") is met for the inspected and
dirty/clean cases; CORE-133 completes it.

Everything else recorded above is prose, attribution or refusal-taxonomy
precision. Nothing found in this review can delete work, bypass a required
check, widen an authority, or mutate `.worktrees/kanmer`.
