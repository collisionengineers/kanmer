# Plan — CORE-125: Serialise non-lease ticket writers against the lease lock

## Objective

Every mutation of a ticket file (and of the documents its revision is computed
from) performs its re-read, its CAS and its write inside the same board-wide
`.kanmer/leases.lock` critical section the lease verbs already take, so an
unlocked writer can no longer rename over a lease or claim write — without
deadlocking on the existing nested call paths and without holding the lock
across slow, column-wide work.

## Starting state

Verified at `origin/main` `9c9a6980` (`packages/core/src/store.ts`, 2362 lines):

- `withLeaseLock` (:1097) wraps `withExclusiveFileLock(.kanmer/leases.lock)`.
  Only `takeTicket` (:1272), `releaseTicket` (:1378), `transferTicket` (:1424)
  and `renewTicket` (:1523) enter it; each re-reads the ticket inside it.
- `updateItem` (:771) does `locateItem` → `readText` → `expectedUpdated` /
  `assertRevision` CAS → `backwardMoveEffects` (CORE-121 `review_round` /
  `remediation_budget`) → `assertDocGate` → optional folder rename →
  `writeFileAtomic` (:850) with no lock. `moveItem` (:888) delegates to it.
  `setDoc` (:1711) and `appendScratch` (:2174) evaluate `assertRevision` and
  their per-document `expectedVersion` outside any lock too.
- **Reproduction (before-fix):** pause a real `renewTicket` inside its critical
  section — it awaits the public `this.getBoard()` at :1563, after its read and
  before its write — and run `updateItem` from a second `KanmerStore` in that
  window. The renewal then writes the item it read before the update, so the
  update is silently reverted; with the reverse interleaving the lease record is
  the loser. Both are the same defect: two read-modify-write cycles on one file
  with no mutual exclusion.
- **Root cause:** mutual exclusion was added per *verb* (the four lease verbs)
  rather than per *resource* (the ticket file), so the lease lock only excludes
  other lease verbs.
- **Re-entrancy hazards that make a naive fix worse:** `updateItem` →
  `appendTransition` (:872) → `setDoc` (:984); `transferTicket` (:1496) and
  `renewTicket` (:1597) call `appendTransition` *while holding the lock*;
  `moveItem` → `computeOrder` → `updateItem` per sibling (:1055) and → the final
  `updateItem` (:906); `deleteItem` → `updateItem` (:1897).
  `withExclusiveFileLock` (io.ts:452) is not re-entrant: a second acquire from
  the same process `EEXIST`s, is not recoverable as stale (its own pid is
  alive), retries `DEFAULT_LOCK_RETRY_MS` (io.ts:74, ~2.145 s) and throws.
- **Duration budget:** that same ~2.145 s retry schedule is the ceiling for how
  long a section may be held before contention becomes errors;
  `DEFAULT_LOCK_STALE_MS` (io.ts:73) is 30 s, so a crashed holder is reclaimed
  and cannot wedge the GUI permanently.

## Governing docs

- **`docs/functional/frd/FRD-030-renewable-workspace-leases-and-batches.md` —
  Meets.** "Lease acquisition and renewal are atomic and revision-safe" and
  AC2 ("stale renewal returns `LEASE_EXPIRED` or `REVISION_CONFLICT` *without
  overwrite*") are currently only true against other lease verbs. Serialising
  the remaining ticket-file writers makes the lease record durable against any
  writer, which is also what "only one live writer owns a workspace" requires
  once the CORE-124 batch stamps live on sibling tickets. No FRD text is
  modified and no new ADR is needed: this is the implementation of an already
  approved property, not a new decision.

## Required changes

1. `withLeaseLock` becomes **re-entrant within one async execution context**: an
   `AsyncLocalStorage<Set<string>>` in `store.ts` records the lock files held by
   the current context; an acquire for a path already in that set runs the work
   directly instead of taking the lock again. Cross-process and cross-request
   exclusion is unchanged — only a nested acquire inside an already-held section
   is short-circuited. Keyed by lock-file path, so two stores bound to different
   boards never alias.
2. `updateItem` runs `locateItem` → read → `expectedUpdated`/`assertRevision`
   CAS → `backwardMoveEffects` → `assertDocGate` → folder rename → write →
   activity/transition inside `withLeaseLock`. Argument validation that touches
   no ticket file (`getBoard`, `assertStage`, `assertFieldAgainstBoard`,
   `assertProfileAgainstBoard`, `assertGroups`, `assertRefs`) stays outside it.
   Behaviour, error text, ordering and the no-op early return are unchanged.
3. `setDoc` and `appendScratch` run their revision/version CAS and their write
   inside `withLeaseLock`, which re-enters harmlessly when they are reached from
   `appendTransition` under `updateItem` or a lease verb.
4. `moveItem` keeps its current three-step shape and takes **no** outer lock:
   `assertMoveAllowed` stays a pre-check before `computeOrder`, `computeOrder`
   stays outside the critical section (it materialises `order` across a whole
   column and would otherwise hold a board-wide lock for hundreds of writes),
   and each write it causes is serialised individually by the locked
   `updateItem`. The final `updateItem` re-reads under the lock, so the CAS and
   the write of the moved ticket are atomic — the property this ticket owes.
5. Tests: a failing-first race test in `packages/core/src/claims.test.ts` (see
   Acceptance checks) plus an assertion that ordinary writes leave no
   `leases.lock` residue.
6. `AGENTS.md` §8: the lease-lock gotcha states that every ticket-file mutation
   now runs under `.kanmer/leases.lock` and that internal helpers must never
   acquire it twice (the guard makes that safe, but new code must not rely on
   accident).

## Expected files

| Action | Repo-root-relative path | Responsibility |
|---|---|---|
| Modify | `packages/core/src/store.ts` | Re-entrant `withLeaseLock`; locked critical sections in `updateItem`, `setDoc`, `appendScratch`; comments recording why `computeOrder` stays outside. |
| Modify | `packages/core/src/claims.test.ts` | Failing-first concurrent `renewTicket` + `updateItem` test, lock-residue assertion, nested-path (no-deadlock) assertion. |
| Modify | `AGENTS.md` | §8 gotcha wording for the widened lock contract. Not generated. |
| Inspect | `packages/core/src/io.ts` | Lock semantics, retry/stale budgets. Not modified. |
| Inspect | `plugins/kanmer/mcp/kanmer-mcp.cjs` | Committed bundle: only rebuilt if `packages/mcp-server` changes; `plugin:check` must still report 39 tools and matching bytes. |

## Do not modify

- `apps/gui/**` — another lane holds `.worktrees/gui-144`.
- `.worktrees/kanmer` (board worktree): never checked out, rebased, pushed or removed.
- `packages/core/src/io.ts` lock implementation, retry schedule or stale window.
- Lease-verb semantics: `force` (CORE-115 F-008), the renew compatibility lane
  (F-004), `WORKSPACE_OCCUPIED`/`BATCH_*` rules — accepted risk, not regressed
  and not "improved" here.
- Any existing test assertion or error string.

## Constraints

- **No deadlock.** Every nested path (`updateItem` → `appendTransition` →
  `setDoc`; `renewTicket`/`transferTicket` → `appendTransition` → `setDoc`;
  `moveItem` → `computeOrder` → `updateItem`; `deleteItem` → `updateItem`) must
  complete. Existing tests already exercise all four.
- **Tight sections.** The locked region must contain only file-local reads, the
  CAS, the gate evaluation and the write — no column materialisation, no
  network, no git. Target well under the ~2.145 s competing-acquirer budget.
- Board-wide lock, not per ticket: lease critical sections already span several
  tickets (`assertWorkspaceFree` scan, CORE-124 sibling `lease_batch` stamps),
  so a per-ticket lock would not exclude a sibling's `updateItem`.
- No board file-format change: the live board stays readable by the installed
  v0.3.12 server. Lock and marker files are already gitignored on the board
  branch (`.kanmer/**/*.lock`, `*.lock.owner-*`, `*.lock.stale-*`).
- `AsyncLocalStorage` comes from `node:async_hooks`; `store.ts` is already
  Node-only (it imports `node:fs`), and the browser entry point
  (`packages/core/src/browser.ts`) must not gain a Node import.
- Never weaken a test.

## Ordered steps

1. Create `.worktrees/core-125` from `origin/main` `9c9a6980` on a new branch;
   `npm ci` if the worktree needs its own install. Record the head SHA.
2. Baseline: run `npm test -w @kanmer/core` unchanged; record exit code, test
   count (expect 417) and wall time — the "before" for the lock-cost comparison.
3. Add the failing-first test to `claims.test.ts`: take a ticket, pause a real
   `renewTicket` inside its critical section by wrapping the public `getBoard`
   of that store instance with a barrier, start `updateItem` on a second
   `KanmerStore`, release, then assert **both** that `lease_id`/`lease_revision`
   are the renewed values and that the concurrent field edit survived. Run the
   file and record the failure verbatim — it must fail against unmodified store
   code.
4. Add the re-entrancy short-circuit to `withLeaseLock` (`AsyncLocalStorage`
   set of held lock-file paths), with a comment naming the nested call paths.
5. Move `updateItem`'s read → CAS → gate → write → activity block inside
   `withLeaseLock`, leaving the pre-validation outside. Do not reorder anything
   within the block.
6. Do the same for `setDoc` and `appendScratch`.
7. Re-run `npm test -w @kanmer/core`: the new test passes, all 417 existing
   tests pass unchanged, and record the new wall time next to the baseline.
8. Update the `AGENTS.md` §8 lease-lock gotcha.
9. Full rail in the worktree: `npm run typecheck`, `node
   packages/mcp-server/src/smoke.mjs`, `npm run smoke:protocol`,
   `npm run plugin:check`, `npm run verify`. Record exact exit codes; re-run a
   known-flaky host failure once and record it as a host quirk rather than
   chasing it.
10. Commit, push, open the PR with a `Kanmer: CORE-125` footer, write the
    post-implementation report, move the ticket to Review.

## Acceptance checks

- **Negative test (must not recur):** the new `claims.test.ts` case fails on
  unmodified store code (recorded verbatim in the report) and passes after the
  change; it asserts no write is lost in either direction across a real
  `renewTicket` / `updateItem` interleaving from two `KanmerStore` instances.
- Production callers are unchanged and already wired: `packages/mcp-server`
  (`update_item`, `move_item`, `set_ticket_doc`, `append_scratch`) and
  `apps/gui/src/main/index.ts` (:1156, :1161, :1335) reach the fixed paths
  through the same `KanmerStore` with no code change.
- **Regression boundary:** all 417 existing core tests pass with no assertion
  changed — in particular the CORE-121 backward-move tests (`updateItem` →
  `setDoc` nesting), the renew phase-change tests (lease verb → `setDoc`
  nesting), the six-store concurrent-renewal test, the CORE-124 batch suite and
  the `moveItem` position/order tests (`computeOrder` → `updateItem` nesting).
  Any of those hanging or failing means the re-entrancy guard is wrong.
- No `leases.lock` (or `.owner-*` / `.stale-*` residue) remains in `.kanmer`
  after ordinary `updateItem` / `moveItem` / `setDoc` calls.
- Lock-duration evidence: the core suite wall time before and after is recorded
  in the report, and the locked region is stated to contain no column-wide or
  external work.
- `npm run verify` and the hosted `verify` check are green at the PR head.

## Commands

Run from the worktree root `C:\Users\Alex\Documents\GitHub\kanmer\.worktrees\core-125`:

- `npm test -w @kanmer/core`
- `node packages/mcp-server/src/smoke.mjs`
- `npm run smoke:protocol`
- `npm run typecheck`
- `npm run plugin:check`
- `npm run verify`

Long runs go to a unique log path (e.g. `%TEMP%\core-125-verify.log`) and are
read back directly; the hosted `verify` on the PR is authoritative over local
host quirks (`scripts/antigravity-plugin-config.test.mjs` EBUSY, `apps/gui`
kanmerGit timeouts, core 5 s timeouts, `http.test.mjs` spawn ETIMEDOUT).

## Failure and deviation rules

- If the failing-first test cannot be made to fail deterministically against
  unmodified code, stop and report rather than shipping a test that proves
  nothing.
- If any nested path deadlocks or a suite hangs, stop: that is a design error in
  the re-entrancy guard, not a flake to retry.
- If serialising a path turns out to need a broader redesign (for example a
  queue or a per-ticket lock hierarchy), stop, record the decision in
  `open-questions` with a recommendation, split the remainder via
  `kanmer-tickets` (`rel: "blocks"`), and proceed only with the bounded part.
- No dependency additions, no changes outside the Expected files table, no
  `apps/gui` edits, no test weakened.

## Stop condition

PR open with a `Kanmer: CORE-125` footer, the post-implementation report
written, and the ticket in Review. No review, no merge, no verification, no
closeout, no other ticket.
