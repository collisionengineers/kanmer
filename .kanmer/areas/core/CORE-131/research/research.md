# Research — CORE-131: the apply half of FRD-028 on revisions and leases

*The research. Not the files document — this is what was **learned**, not what
will be **touched**.*

The ticket body already records the analysis and is the starting point; this
document only verifies it against the merged code and answers the questions the
plan must resolve.

## Question

Given CORE-114's document-inclusive revision, CORE-115's leases, CORE-125's
board write lock and SKILL-037's `failure_class`, what does a safe
`apply_reconciliation` actually look like in this codebase — where does the
apply/collect seam sit, what may it do, how does it route a typed verification
failure, where does its audit live durably, and what moves with the tool roster?

## Findings

### The read-only inspector, exactly as CORE-122 shipped it

- `packages/core/src/reconciliation.ts:44` — `reconcileEvidence(input)` is pure:
  it takes a fully-populated `ReconciliationEvidence`, returns
  `{ evidence, findings, recommendation }` and touches nothing. Its refusal
  ordering is load-bearing and documented in place: board worktree →
  release evidence preserved → `EVIDENCE_INCONCLUSIVE` → advisory warnings
  recorded without returning → stage routes → warnings become hard stops for
  non-Review stages.
- The recommendation is `{ action, targetStatus?, advisory: true }`
  (`packages/core/src/types.ts:906`). There is **no proposal id and no binding
  to the evidence it came from** — CORE-122 deliberately removed PR #286's
  `ReconciliationProposal { id, ticketId, ticketUpdated, action, targetStatus }`.
  Restoring a binding is therefore new work, not a revert.
- `packages/mcp-server/src/reconciliation.ts:290` —
  `collectReconciliationEvidence` is the only place Git/GitHub run. All
  subprocesses are bounded (`GIT_TIMEOUT_MS`/`GH_TIMEOUT_MS` 15 s, capped
  buffers). `reconcileTicket` at the bottom of that file is `collect` then
  `classify`, and its doc comment says "Never writes to the store."
- `claim.state` is derived from `leaseState(item, now, leaseConfig(board))` and
  mapped `live → "current"`, so `expired` is already a first-class fact
  (`packages/mcp-server/src/reconciliation.ts:305`).
- `workspaceEvidence` proves repository identity by comparing physical
  `git --git-common-dir` paths, and returns `boardWorktree: true` +
  `state: "unavailable"` when the recorded worktree resolves to
  `store.paths.projectRoot` — i.e. the board worktree is detected at collection
  time, before the classifier ever sees it.
- `release.state` is hard-coded `"not-applicable"` with a comment that CORE-116
  owns persisted release attempts. Nothing in this ticket may invent release
  evidence; FRD-028 acceptance 5 is satisfied by *not touching* it.

### What the merged contracts actually give us

- **Revision (CORE-114).** `store.getRevision(id)` →
  `{ revision, updated, documents }`, computed over the ticket file **plus every
  pipeline document** (`packages/core/src/store.ts:320-337`). `assertRevision`
  throws `Conflict: "<id>" revision changed since you read it …`
  (`store.ts:345`). Every ticket mutation already accepts `expectedRevision`:
  `updateItem` (`store.ts:781`), `moveItem` (`store.ts:909`), `releaseTicket`
  (`store.ts:1422`), `transferTicket` (`store.ts:1480`), `renewTicket`,
  `setDoc`. **This is the direct fix for F-015**: a proof rewrite changes the
  revision even though `updated` on the ticket file does not, so a
  `revision`-bound apply cannot be fooled by a proof that flipped PASS→FAIL
  between collection and mutation. `expectedUpdated` alone — which is all
  PR #286 had — provably cannot see that.
- **Lock (CORE-125).** `withLeaseLock` (`store.ts:1143`) is the board's write
  lock, not the lease verbs' private one; `updateItem`, `moveItem`, `setDoc`
  and `appendScratch` all run locate → read → CAS → write inside it. It is
  re-entrant **within one async execution context only**, via an
  `AsyncLocalStorage` set of held lock-file paths, because
  `updateItem → appendTransition → setDoc` nests. Consequence for this ticket:
  an apply that composes existing store verbs is already serialised correctly
  and must **not** open its own lock section around slow work — AGENTS.md §8
  item 17 says nothing slow, networked or git-shaped belongs inside it. The
  evidence re-collection (git/gh subprocesses) must therefore happen *outside*
  the lock, and the revision CAS inside it is what closes the window.
- **Transfer as reclaim (CORE-115).** `transferTicket` (`store.ts:1468`)
  preserves `taken_at`, `branch` and `worktree` — "a transfer changes who is
  responsible, never where the work is" — refuses a live lease with
  `CLAIM_LIVE` unless the reason begins `operator:`, and refuses
  `RECOVERY_REFUSED` for `boardWorktree`, `foreign-repository` or
  `branch-mismatch` recovery evidence. It takes a `recovery:
  LeaseRecoveryEvidence`, which `leaseRecoverySummary(evidence)` in the MCP
  collector already produces from exactly the `ReconciliationEvidence` this
  ticket collects. Expired-claim recovery is therefore a *composition*, not new
  mutation code.
- **`failure_class` (SKILL-037).** It exists **only in skill prose**:
  `plugins/kanmer/skills/kanmer-verify/SKILL.md:125` defines the key and
  `:144` the routing table; `kanmer-auto/SKILL.md:148` repeats it;
  `scripts/verify-skill-prose.mjs:569` pins the wording. Grep confirms **no
  TypeScript reads it** — `proofEvidence` in
  `packages/mcp-server/src/reconciliation.ts:76` decodes `kind`, `result`,
  `merged_sha`, `environment`, `verified_at` and `attempts` and stops there.
  Making acceptance 3 machine-checkable requires extending `proofEvidence` and
  `ReconciliationEvidence["proof"]`, and that is a genuinely new (small) piece
  of the surface, not a salvage.

### The audit record

- `appendActivity` (`packages/core/src/activity.ts:36-56`) wraps its whole body
  in `try { … } catch { /* best-effort by design */ }` and additionally
  **truncates** the log to the last `MAX_LINES/2` entries once it grows past
  `SIZE_CHECK_BYTES`. It is not durable and is not an audit record. This is
  precisely CORE-113's unresolved objection, and PR #286's
  `store.applyReconciliation` recorded the action *only* there.
- `appendTransition` (`store.ts:1003`) is the durable alternative CORE-121
  established: it appends `- <iso> <line>` to `scratch/execution.md` under a
  `## Transitions` heading, via `setDoc(..., { append: true })`. It is
  committed to the board branch, is included in the document-inclusive revision,
  and is already the record for (a) every backward move (`store.ts:887`),
  (b) claim transfer with its re-read evidence (`store.ts:1541`) and (c) lease
  migration/phase change (`store.ts:1642`). It is private and guarded by
  `loc.kind === "v2"`.
- Composing `moveItem(..., { reason })` and `transferTicket(..., { recovery })`
  therefore *already* writes a durable transition line for the two hardest
  cases. The gap is `RELEASE_CLEAN_TERMINAL_CLAIM` (a forward-neutral release
  that writes no transition today) and the desire for one line that names the
  reconciliation action and the old/new responsible controller in the FRD's
  words.

### The blocker nobody has written down yet

- `backwardMoveEffects` (`store.ts:940`) refuses **`review → implementing`**
  with `REVIEW_RETURN_NEEDS_ATTESTATION` unless either a valid
  `scratch/review.md` `needs-changes` attestation is bound to one of the
  ticket's `prs`, or the reason begins `operator:`. It also refuses
  `REMEDIATION_BUDGET_EXHAUSTED` once `review_round >= remediation_budget`.
- Both of the classifier's `MOVE_TO_IMPLEMENTING` routes —
  `CLOSED_UNMERGED_REVIEW` and `REVIEW_WITHOUT_PR_OR_WORKER` — are exactly the
  cases where **no attestation can exist**. PR #286's
  `store.applyReconciliation` called `this.moveItem(id, { status:
  "implementing", expectedUpdated })` with no reason at all; on today's `main`
  that same call throws `BACKWARD_MOVE_NEEDS_REASON` before it reaches the
  attestation check. The apply surface must supply a reason, and only an
  `operator:`-prefixed one gets through. Recorded as a parked, operator-only
  question with a recommendation.
- By contrast `verifying → implementing` and `verifying → preparing` are
  ordinary backward moves (`from !== "review"`), so a reason alone authorises
  them. AC3's typed verification routing needs no new authority.

### Tool roster: every count assertion

Registered tool names live in `packages/mcp-server/src/index.ts`
(`reconcile_ticket` at `:869`). The count 39 is asserted in five places and
implied in two more:

| Where | Line | Shape |
|---|---|---|
| `packages/mcp-server/src/smoke.mjs` | 69 | `tools.tools.length === 39` |
| `packages/mcp-server/src/smoke.mjs` | 72 | roster name list (`reconcile_ticket` present; add `apply_reconciliation`) |
| `packages/mcp-server/src/smoke-protocol.mjs` | 160-161 | `tools/list returns 39 tools on ${proto}` — message string **and** predicate |
| `AGENTS.md` | 413 (§4) | "registers **39 tools**" |
| `AGENTS.md` | 638 (§8 item 19) | "(roster stays 39)" — CORE-118's note; must not silently contradict |
| `docs/manual/connect.md` | 145 | "verifies all 39 tools and their file mutations" |
| `apps/gui/src/renderer/src/manual/chapters.generated.ts` | 28 | generated **from** connect.md — regenerate with `npm run build:manual`; `scripts/build-manual.mjs:249` fails the build when it is stale |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | 26 | no count, but `scripts/check-plugin-sync.mjs:89-96` compares registered names against the first cell of each tool-table row and fails with `Undocumented tools:` |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | — | `check-plugin-sync.mjs:113` verifies the **committed bundle's bytes**, so `npm run build` then re-commit the bundle; `plugin:check` also asserts an isolated MCP handshake tool count (`:484-486`) |

### Board and CI facts that constrain how this ticket is worked

- The board is a worktree at `.worktrees/kanmer` on the orphan `kanmer-board`
  branch (`get_status`). The group's interim rule: confirm local tip ==
  `origin/kanmer-board` before trusting a `kanmer-gate` result, and agents must
  not commit or push that branch. CORE-113's terminal CI failure (run
  33022278471) was exactly this unsynchronised-board symptom, not a code defect.
- Board format is 3 / v2 layout, so `loc.kind === "v2"` holds and
  `appendTransition` will actually write.

## Implications

1. **The seam is fixed by the lock rule, not by taste.** Collection is
   networked and slow, so it cannot run inside `withLeaseLock`; the revision CAS
   inside the lock is the only thing that can make the apply atomic. So: the MCP
   boundary re-collects and re-classifies, then hands core an
   already-classified action *plus* the revision it was computed from, and core
   refuses unless that revision is still current. Core stays pure and git-free.
2. **The recommendation must carry its revision.** Advisory today means
   unbindable. Adding `revision` (and the ticket id) to the recommendation —
   computed at collection time by the boundary, not by the pure classifier — is
   the minimum needed for "corrects only a still-current proposed action".
   A 64-char proposal hash is not required and adds a second thing to keep in
   sync; the revision *is* the fingerprint, and it is document-inclusive.
3. **Almost nothing new mutates.** `MOVE_TO_*` is `moveItem`,
   release is `releaseTicket`, expired-claim recovery is `transferTicket` with
   `leaseRecoverySummary(evidence)`. All four already take `expectedRevision`,
   already run under the write lock, already refuse the board worktree
   (transfer) and already write durable transitions (move-backward, transfer).
   The new code is a dispatcher plus the guards, not a new mutation path.
4. **`failure_class` needs a decoder.** Without it AC3 is prose only. Extend
   `proofEvidence` and the `proof` evidence shape with
   `failureClass: "implementation" | "plan" | "transient" | "inconclusive"`,
   defaulting a FAIL/INCONCLUSIVE proof that names no class to `inconclusive`,
   matching `kanmer-verify/SKILL.md:144` exactly.
5. **The audit belongs in `## Transitions`.** It is durable, committed,
   revision-inclusive and already the established home for the two adjacent
   audited events. `appendActivity` stays as the secondary index it is.
6. **Review → Implementing is the one authority question.** Everything else in
   AC2/3/4 is expressible with existing authorities.

## Open questions

See `open-questions/open-questions.md`. One is parked as operator-only (the
`review → implementing` authority); the rest are resolved in `plan/plan.md`.
