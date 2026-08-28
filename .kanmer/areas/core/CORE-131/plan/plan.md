# Plan — CORE-131: `apply_reconciliation` — mutating recovery on revisions and leases

*The plan. Not the checklist — reasoning establishes bounded work; the checklist
distils it into independently observable actions.*

## Objective

Add one `apply_reconciliation` MCP tool and its core dispatcher so a recovery
action proposed by `reconcile_ticket` can be applied — and only while still
current — satisfying FRD-028 acceptance criteria 2, 3 and 4 without regressing
1 or 5. The roster moves 39 → 40 in the same change.

## Starting state

- `reconcile_ticket` (CORE-122) is read-only and shipped:
  `packages/core/src/reconciliation.ts` is a pure classifier over supplied
  `ReconciliationEvidence`; `packages/mcp-server/src/reconciliation.ts` is the
  only place Git/GitHub run, with bounded subprocesses. There is no apply
  surface, and `ReconciliationRecommendation` is `{ action, targetStatus?,
  advisory: true }` — it carries no binding to the state it was computed from.
- `store.getRevision(id)` returns a **document-inclusive** revision, and
  `updateItem` / `moveItem` / `releaseTicket` / `transferTicket` / `setDoc` all
  accept `expectedRevision` and refuse with a `Conflict:` prefix
  (`packages/core/src/store.ts:345`).
- Every ticket-file write runs inside `withLeaseLock`, re-entrant only within
  one async execution context (`store.ts:1143`).
- `transferTicket` is CORE-115's reclaim: it preserves branch/worktree, refuses
  `CLAIM_LIVE` without an `operator:` reason and `RECOVERY_REFUSED` for
  board/foreign/branch-mismatched workspaces, and records its re-read evidence
  in a `## Transitions` line.
- `failure_class` exists only in skill prose
  (`plugins/kanmer/skills/kanmer-verify/SKILL.md:125,144`); no TypeScript reads
  it, so `proofEvidence` cannot express AC3's typed routing today.
- `backwardMoveEffects` (`store.ts:940`) refuses `review → implementing`
  without a bound `needs-changes` attestation or an `operator:` reason. PR
  #286's apply predates every one of these contracts; it is reference only
  (`research/salvage-pr-286.md`).
- Board: format 3 / v2 layout, board worktree `.worktrees/kanmer` on
  `kanmer-board`. Registered roster is 39 tools.

## Governing docs

`refs`: `docs/functional/frd/FRD-028-rescue-and-reconciliation.md`.

- **Meets AC2** — "an explicit apply corrects only a still-current proposed
  action and records an audit entry; a changed revision returns a structured
  conflict". Step 4 re-collects and re-classifies through the *same*
  `reconcileTicket` the dry run used and refuses on any drift; the freshness
  token is the document-inclusive `revision`, and the refusal is a coded
  `REVISION_CONFLICT` / `RECONCILIATION_DRIFT` via `failCoded`, not a bare
  `Error`. The audit entry is a `## Transitions` line (step 5).
- **Meets AC3** — "Merged Review tickets, PASS Verifying tickets,
  plan/implementation verification failures and abandoned claims route to their
  correct stages or terminal outcomes". Merged-Review → Verifying and
  PASS-Verifying → Done already classify; step 2 adds `failure_class` decoding
  and step 3 the typed routes and expired-claim recovery.
- **Meets AC4** — "A dirty expired workspace is preserved and reported; cleanup
  only occurs for a terminal, clean, explicitly authorized target". Recovery of
  an expired claim is `transferTicket`, which never deletes or cleans anything;
  the only release is `RELEASE_CLEAN_TERMINAL_CLAIM`, gated on `status === done`
  **and** `workspace.state === "clean"` **and**
  `claimIdentity === "matches-claim"`, and it releases the *claim*, not the
  worktree.
- **Does not regress AC1** — the dry run keeps its byte-identical no-mutation
  proof; the new tool is a separate registration and `reconcileTicket` is
  unchanged in behaviour beyond additive result fields.
- **Does not regress AC5** — `release.state` stays hard-coded
  `not-applicable`; the classifier's existing `RELEASE_EVIDENCE_PRESERVED` and
  `BOARD_WORKTREE_PROTECTED` refusals return before any recommendation, and no
  action bypasses a required check.
- **Modifies**: nothing. **New ADR**: none. The one decision that would need an
  ADR — adding a third authority for `review → implementing` — is explicitly
  *not* taken (see Constraints and the parked question).

## Required changes

### 1. Bind a recommendation to the state it came from

`ReconciliationRecommendation` gains `ticketId: string` and
`revision: string | null`, keeping `advisory: true`. The **collector** stamps
them (`store.getRevision(id)`); the pure classifier still never touches the
store. `revision: null` on a legacy-layout ticket, and apply refuses such a
ticket outright — a board without revisions cannot be reconciled safely.

### 2. Decode `failure_class`

`ReconciliationEvidence["proof"]` gains
`failureClass?: "implementation" | "plan" | "transient" | "inconclusive"`.
`proofEvidence` reads `failure_class` from the proof frontmatter; for a `FAIL`
(or `INCONCLUSIVE`) record that names no class, or names an unrecognised one,
the value is `"inconclusive"` — the default `kanmer-verify/SKILL.md:144`
mandates. A `PASS` record carries no class. Everything else about
`proofEvidence` is unchanged, including its rejection of an existence-only
proof gate.

### 3. Two new classifier routes

Inside the existing stage section of `reconcileEvidence`, after the existing
refusals — the documented ordering (board worktree → release evidence →
`EVIDENCE_INCONCLUSIVE` → advisory warnings recorded without returning → stage
routes) is preserved exactly:

- **Verifying + `proof.state === "fail"`.** Replace the current
  `FAILED_VERIFICATION_REQUIRES_DISPOSITION` dead end with a route on
  `failureClass`:

  | `failureClass` | finding | recommendation |
  |---|---|---|
  | `implementation` | `VERIFICATION_FAILED_IMPLEMENTATION` (warning) | `ROUTE_VERIFICATION_FAILURE`, `targetStatus: "implementing"` |
  | `plan` | `VERIFICATION_FAILED_PLAN` (warning) | `ROUTE_VERIFICATION_FAILURE`, `targetStatus: "preparing"` |
  | `transient` | `VERIFICATION_TRANSIENT_RETRY` (warning) | **`null`** — stays in Verifying |
  | `inconclusive` (incl. absent/unrecognised) | `VERIFICATION_INCONCLUSIVE` (warning) | **`null`** — stays in Verifying |

  A `null` recommendation is a normal outcome, not an error: `transient` means
  "rerun the check", and no board mutation expresses that.

- **`claim.state === "expired"`.** The existing `CLAIM_EXPIRED` warning stays
  (it is recorded for every stage). Additionally, when the stage is not
  terminal, the workspace is `clean`, `dirty` or `missing`, and
  `claimIdentity` is `matches-claim` or `not-applicable`, recommend
  `RECOVER_EXPIRED_CLAIM` with no `targetStatus`. **Dirty is explicitly
  allowed** — AC4 preserves dirty work, it does not refuse to reassign
  ownership of it. `foreign-repository`, `branch-mismatch`, `detached` and
  `unavailable` do not get a recommendation; `transferTicket` would refuse them
  anyway with `RECOVERY_REFUSED` and the classifier should not propose a
  refusal. This route is placed **before** the
  `if (dirtyWorkspace || missingWorkspace || …) return none();` line so a dirty
  expired claim is still recoverable, and **after** the Review recovery routes
  so a merged Review still advances rather than being reduced to a transfer.

### 4. `store.applyReconciliation` — the dispatcher

```ts
applyReconciliation(id, {
  action, targetStatus?, expectedRevision, reason?, controller?, actor,
  recovery?: LeaseRecoveryEvidence,
}): Promise<{ item: Item; action: ReconciliationAction; from: {...}; to: {...} }>
```

Pure dispatch onto existing verbs — **no new mutation path, no second read
outside the lock, no second ownership model**. Each case re-asserts its
preconditions against the item and then calls the verb with `expectedRevision`,
letting the verb's own locked CAS be the atomicity boundary:

| Action | Precondition | Verb |
|---|---|---|
| `MOVE_TO_VERIFYING` | `status === "review"`, `targetStatus === "verifying"` | `moveItem(id, { status, expectedRevision })` |
| `MOVE_TO_DONE` | `status === "verifying"`, `targetStatus === "done"` | `moveItem(id, { status, expectedRevision })` |
| `MOVE_TO_IMPLEMENTING` | `status === "review"`, `targetStatus === "implementing"`, caller supplied `reason` | `moveItem(id, { status, expectedRevision, reason })` — the existing `backwardMoveEffects` contract judges the reason; its `BACKWARD_MOVE_NEEDS_REASON` / `REVIEW_RETURN_NEEDS_ATTESTATION` / `REMEDIATION_BUDGET_EXHAUSTED` refusals pass through unchanged |
| `ROUTE_VERIFICATION_FAILURE` | `status === "verifying"`, `targetStatus ∈ {implementing, preparing}`, `reason` defaulted to `` `proof FAIL <failureClass>: <summary>` `` when the caller supplies none | `moveItem(id, { status: targetStatus, expectedRevision, reason })` — an ordinary backward move; a reason alone authorises it |
| `RELEASE_CLEAN_TERMINAL_CLAIM` | `status === "done"`, no `targetStatus` | `releaseTicket(id, { expectedRevision })` |
| `RECOVER_EXPIRED_CLAIM` | ticket is taken, `leaseState(...) === "expired"`, no `targetStatus` | `transferTicket(id, { assignee: controller ?? actor, controller, expectedRevision, recovery })` — **never** with an `operator:` reason synthesised by this code, so a live lease still refuses with `CLAIM_LIVE` |

`default:` keeps PR #286's `const exhaustive: never` exhaustiveness guard.

### 5. The durable audit record

Every successful action appends **one** line to the `## Transitions` record in
`scratch/execution.md` via the existing private `appendTransition`
(v2-guarded), in the established grammar:

```
- <iso> reconcile <ACTION> by <actor>; stage <from> → <to>; controller <old> → <new>; revision <expectedRevision>
```

`stage` is omitted for the two claim actions and `controller` for the pure
stage moves. `moveItem`-with-reason and `transferTicket` write their own
transition lines as well; that is deliberate and correct — the reconciliation
line records *why the tool acted*, theirs records *what the verb did*. The
existing best-effort `appendActivity` entry is kept as a secondary index only,
and is never the audit record.

### 6. The MCP boundary apply

`applyReconciliation(store, { id, expectedRevision, reason?, controller? }, run?)`
in `packages/mcp-server/src/reconciliation.ts`:

1. `const fresh = await reconcileTicket(store, id, run)` — the same function the
   dry run used, so re-collection cannot drift from what was reported. This runs
   **outside** any lock (it spawns git/gh).
2. Refuse `RECONCILIATION_INCONCLUSIVE` when `fresh.recommendation === null`.
3. Refuse `REVISION_CONFLICT` when
   `fresh.recommendation.revision !== expectedRevision`, quoting both values.
4. Refuse `RECONCILIATION_DRIFT` when the freshly-classified action or
   `targetStatus` differs from what that revision implied — belt and braces; a
   revision match should already make this unreachable.
5. Delegate to `store.applyReconciliation`, which re-checks preconditions and
   passes `expectedRevision` into the locked verb.
6. Return `{ result: fresh, item, action, transition }`.

All refusals are `KanmerError`/`failCoded` structured codes.

### 7. Register the tool

`apply_reconciliation`, `readOnlyHint: false, destructiveHint: false,
idempotentHint: false, openWorldHint: true`, registered through `write(...)`.
Input: `id`, `expected_revision` (required), `reason` (optional),
`controller` (optional). **Do not** hand-add `expected_project` — the
`registerTool` override injects it for every `readOnlyHint: false` tool.

## Expected files

| Action | Repo-root-relative path | Responsibility |
|---|---|---|
| Modify | `packages/core/src/types.ts` | `ReconciliationAction` gains two members; recommendation gains `ticketId`/`revision`; `proof` gains `failureClass`; apply input/result types |
| Modify | `packages/core/src/reconciliation.ts` | typed verification routes + expired-claim route, refusal ordering preserved |
| Modify | `packages/core/src/store.ts` | `applyReconciliation` dispatcher + its transition line |
| Modify | `packages/core/src/index.ts` | export the new types |
| Modify | `packages/mcp-server/src/reconciliation.ts` | `failure_class` decode, revision stamping, boundary apply |
| Modify | `packages/mcp-server/src/index.ts` | register `apply_reconciliation` |
| Modify | `packages/core/src/reconciliation.test.ts` | classifier tests for the new routes and preserved ordering |
| Modify | `packages/mcp-server/src/reconciliation.test.mjs` | boundary tests incl. the F-015 proof-only-drift case |
| Modify | `packages/mcp-server/src/smoke.mjs` | `39 → 40` at :69, roster name at :72, apply assertions near :2938 |
| Modify | `packages/mcp-server/src/smoke-protocol.mjs` | `39 → 40` in message string **and** predicate at :160-161 |
| Modify | `AGENTS.md` | §4 line 413 count; §8 item 19 "(roster stays 39)"; new §8 note on the apply contract |
| Modify | `docs/manual/connect.md` | line 145 count |
| Modify (generated) | `apps/gui/src/renderer/src/manual/chapters.generated.ts` | **generated artifact** — produce with `npm run build:manual`, never hand-edit |
| Modify | `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | add the `apply_reconciliation` write-tool row; correct the `reconcile_ticket` row's "There is no apply surface" |
| Modify (generated) | `plugins/kanmer/mcp/kanmer-mcp.cjs` | **generated artifact** — `npm run plugin:build`; `plugin:check` byte-compares it |
| Inspect | `packages/core/src/activity.ts` | confirms why the activity log is not the audit record |
| Inspect | `plugins/kanmer/skills/kanmer-verify/SKILL.md` | the normative `failure_class` table the code must match |

## Do not modify

- `.worktrees/kanmer` (board worktree, orphan `kanmer-board` branch),
  `.worktrees/core-116`, `.worktrees/core-128` — all in active use. Never
  create, switch, remove or write any of them, and never commit or push
  `kanmer-board`.
- Branch `core-113-rescue-reconciliation` — reference only; nothing is
  cherry-picked from it.
- `packages/core/src/store.ts`'s lease section beyond the new dispatcher: no new
  lease verb outside `withLeaseLock`, no change to `leaseState`, no second
  ownership model, no `migrate_board` step.
- `backwardMoveEffects` — CORE-121's authority contract is not widened.
- The `release` evidence branch: it stays `not-applicable` until CORE-116.
- `apps/gui/**` beyond the generated manual chapter.
- `board.yml`, ticket frontmatter schema, gates.

## Constraints

- **No new authority.** `review → implementing` remains gated by CORE-121's
  attestation-or-`operator:` rule. This code never synthesises an `operator:`
  reason, and never passes `force`. See the parked question in
  `open-questions/open-questions.md`.
- **Nothing slow, networked or git-shaped inside `withLeaseLock`** (AGENTS.md §8
  item 17). Evidence collection is outside it; the revision CAS inside the
  existing verbs is what makes the apply atomic.
- **Core stays pure and git-free.** The classifier never reads the store; only
  the MCP collector spawns subprocesses, reusing the existing bounded
  `GIT_TIMEOUT_MS`/`GH_TIMEOUT_MS`/buffer constants.
- **Additive types only.** `LeaseRecoveryEvidence` is derived from
  `ReconciliationEvidence` by `leaseRecoverySummary`; widening `proof` must not
  change what `transferTicket` records.
- **Refusal ordering in `reconcileEvidence` is load-bearing** and documented in
  place; new routes go inside the stage section only.
- The `failure_class` semantics must match `kanmer-verify/SKILL.md:144`
  verbatim, including "a proof that names no class is `inconclusive`, never
  retryable". `scripts/verify-skill-prose.mjs` pins that prose.
- Run the rail from a **normal checkout**, not a linked worktree —
  `plugin:check` refuses there (AGENTS.md §8 gotcha 8).
- Before trusting a `kanmer-gate` result, confirm the board tip equals
  `origin/kanmer-board` (HZN-008 interim rule; this is what made CORE-113's CI
  look red).

## Ordered steps

1. **Types.** In `packages/core/src/types.ts`, extend `ReconciliationAction`
   with `ROUTE_VERIFICATION_FAILURE` and `RECOVER_EXPIRED_CLAIM`; add
   `ticketId` and `revision: string | null` to `ReconciliationRecommendation`
   (keeping `advisory: true`); add `failureClass?` to
   `ReconciliationEvidence["proof"]`; add the apply input/result interfaces.
   Export from `packages/core/src/index.ts`. Expected result: `npm run typecheck
   -w @kanmer/core` fails only where the new fields are not yet populated.
2. **Decode `failure_class`.** In `packages/mcp-server/src/reconciliation.ts`,
   extend `proofEvidence` to read `failure_class` and default a non-PASS record
   to `inconclusive`. Depends on step 1. Expected result: a fixture proof with
   `failure_class: plan` decodes as `{ state: "fail", failureClass: "plan" }`;
   one with no class decodes as `inconclusive`.
3. **Classifier routes.** In `packages/core/src/reconciliation.ts`, add the
   typed verification routing table and the expired-claim route at the
   positions described in Required changes §3. Depends on step 1. Expected
   result: the existing 27 core reconciliation tests still pass unchanged.
4. **Stamp the binding.** In the collector, populate `ticketId` and
   `revision` (from `store.getRevision(id)`) on the returned recommendation.
   Depends on steps 1 and 3.
5. **`store.applyReconciliation`.** Add the dispatcher in
   `packages/core/src/store.ts` per the table in Required changes §4, plus the
   `appendTransition` audit line and the secondary `appendActivity` entry.
   Depends on steps 1 and 3. Expected result: every branch reaches an existing
   verb with `expectedRevision`; no new file write, no new lock section.
6. **Boundary apply.** Add `applyReconciliation` to
   `packages/mcp-server/src/reconciliation.ts` with the six-step refusal order,
   returning coded errors via `failCoded`. Depends on steps 2, 4, 5.
7. **Register the tool** in `packages/mcp-server/src/index.ts` through
   `write(...)` with the annotations in Required changes §7. Depends on step 6.
8. **Core tests.** Extend `packages/core/src/reconciliation.test.ts`: each new
   route, each `failure_class`, the expired-dirty case, the board-worktree
   refusal, and a test that asserts the refusal ordering is unchanged.
9. **Boundary tests.** Extend `packages/mcp-server/src/reconciliation.test.mjs`:
   the **F-015 regression** (collect, rewrite only `proof/proof.md` PASS→FAIL,
   apply → `REVISION_CONFLICT`), stale-revision refusal, `null`-recommendation
   refusal, and one successful apply per action from fixture evidence.
10. **Smoke.** `packages/mcp-server/src/smoke.mjs`: `39 → 40`, add
    `apply_reconciliation` to the roster list, assert its annotations, assert a
    stale `expected_revision` is refused **and mutates nothing**, and keep the
    existing byte-identical dry-run proof (AC1 regression).
    `smoke-protocol.mjs`: `39 → 40` in both places.
11. **Docs and generated artifacts.** `AGENTS.md` §4 count, §8 item 19
    parenthetical and a new §8 note; `docs/manual/connect.md:145`;
    `tool-reference.md` rows; then `npm run build:manual` and
    `npm run plugin:build`, committing both generated outputs.
12. **Full rail** from a normal checkout: `npm run verify`.

## Acceptance checks

- **Production caller / registration.** `apply_reconciliation` is registered in
  `packages/mcp-server/src/index.ts` via `write(...)`, appears in `tools/list`
  as tool 40, and is documented in `tool-reference.md` — `plugin:check` proves
  the last one and fails with `Undocumented tools:` otherwise.
- **AC1 not regressed.** The existing dry-run byte-identical assertion in
  `smoke.mjs` still passes; `reconcile_ticket` keeps `readOnlyHint: true`.
- **AC2.** A stale `expected_revision` returns a structured `REVISION_CONFLICT`
  and mutates nothing. The F-015 case — only `proof/proof.md` changed between
  collect and apply — is refused, with a focused regression test naming F-015.
  Each successful apply appends exactly one `## Transitions` line naming the
  action and the old → new controller.
- **AC3.** From fixture evidence: merged Review → Verifying; PASS Verifying →
  Done; `failure_class: implementation` → Implementing; `plan` → Preparing;
  `transient` and a class-less FAIL both yield **no recommendation** and leave
  the ticket in Verifying; an expired claim is recovered by transfer.
- **AC4.** An expired claim over a **dirty** workspace is recovered with the
  worktree untouched (assert `git status --porcelain` in the fixture worktree is
  byte-identical before and after) and nothing deleted; a **live** claim refuses
  with `CLAIM_LIVE`; `RELEASE_CLEAN_TERMINAL_CLAIM` fires only for
  `done` + `clean` + `matches-claim`.
- **AC5.** The board worktree is refused as a target in every path — asserted
  both at collection (`workspaceEvidence` → `boardWorktree: true`) and in the
  classifier's first refusal (`BOARD_WORKTREE_PROTECTED`), and separately by
  `transferTicket`'s `RECOVERY_REFUSED`. `release.state` remains
  `not-applicable`. No path force-pushes or bypasses a required check.
- **Roster.** All nine count/documentation sites move together; `npm run verify`
  is the single proof (it runs tests, typecheck, build, every smoke, skill and
  managed-block verification, then `plugin:check`).
- Tests prove the claims without weakened assertions; exact commands and exit
  evidence are retained in the post-implementation report.

No schema change, no migration, no new runtime dependency.

## Commands

Focused loop:

```
npm run build:core
npm test -w @kanmer/core -- reconciliation
node --test packages/mcp-server/src/reconciliation.test.mjs
npm run typecheck
```

Server + smoke:

```
npm run build
node packages/mcp-server/src/smoke.mjs
npm run smoke:protocol
```

Docs and generated artifacts:

```
npm run build:manual
npm run verify:docs
npm run plugin:build
npm run plugin:check
```

Full rail, from the **normal checkout** at
`C:\Users\Alex\Documents\GitHub\kanmer` (not a linked worktree):

```
npm run verify
```

## Failure and deviation rules

- Stop and report on: a failing check that is not obviously the new code; an
  unknown API or file; scope expansion; any new dependency; a conflict with
  FRD-028 or with CORE-121's backward-move contract; any command that would
  touch `.worktrees/kanmer`, `.worktrees/core-116` or `.worktrees/core-128`.
- If a route cannot be made to work without widening `backwardMoveEffects`,
  **stop** — that is the parked operator question, not an implementation
  decision.
- If `plugin:check` refuses because the checkout is a linked worktree, that is
  AGENTS.md §8 gotcha 8; run the rail from the normal checkout rather than
  working around it.
- A red `kanmer-gate` is not evidence of a code defect until the board tip is
  confirmed equal to `origin/kanmer-board`.
- Deviations are recorded in the post-implementation report, never silent
  redesigns.

## Stop condition

Stop when `npm run verify` is green from the normal checkout, the
post-implementation report is written, and the PR is open with its
`Kanmer: CORE-131` footer — the ticket sits in Review. Do not review it, do not
merge it, and do not start another ticket.
