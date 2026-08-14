# assertFinalStageProven hardcodes proof.md — bypasses Phase 1 per-area gates on last-stage change

- **Severity:** nit
- **PR:** #5 (Phase 1: core document model)
- **File:** `packages/core/src/store.ts:199-207` (guard body at 1114-1129)
- **Source bug ids:** bug_004

## Follow-up verdict — partially validated

The core inconsistency is real. Normal moves resolve the ticket area's configured
gates and use threshold semantics; a whole-board change of the last stage ignores
that model and checks one literal file. This can reject satisfied custom policy or
accept a ticket missing its actual requirements.

The original examples are not fully coherent about which ticket occupies the
newly final stage, and the suggested “evaluate the `enter: newLast` subset” is too
narrow. Gates can use `leave`, multi-stage thresholds and repo-doc requirements.
The correction must use the proposed board ordering and the shared evaluator,
not introduce an enter-only second model. D6 also remains authoritative: creation
itself is ungated; this invariant applies only when a board write changes which
stage is final.

## Summary

`assertFinalStageProven` (store.ts:1114-1129, called from `setBoard` at :199-201 when the last-stage id changes) still hardcodes `docFileIn(loc.dir, "proof")` and quotes `set_ticket_doc(doc: "proof")` in its error text — contradicting Phase 1's per-area configurable gate model that the neighbouring `assertDocGate` (store.ts:1026-1063) already implements via `resolveGates(board, item.area)`. On a board with per-area gate overrides this misfires two ways: a legitimate last-stage reorder is rejected with bogus "proof.md is missing" offenders when the area's gate uses a different doc, or the reorder is accepted while grandfathering tickets whose area gate requires something other than proof.

Trigger is narrow (last-stage id must change AND a per-area gate must differ from proof, both opt-in), so shipped defaults are unaffected.

## Detail

Phase 1 makes the doc-gate model per-area configurable: `board.docs.default.gates` and `board.docs.areas[X].gates` declare which doc is required at each transition. The move-time path was correctly refactored into `assertDocGate`, which resolves each ticket's area via `resolveGates(board, item.area)` and delegates to the pure `evaluateGates` engine. But the `setBoard` invariant guard — fired whenever `nextLast !== prevLast` (a reorder, an insert-after-last, a tail-changing stage rename) — still literally checks:

```ts
if (!(await pathExists(docFileIn(loc.dir, "proof")))) offenders.push(item.id);
```

and its error text names `set_ticket_doc(doc: "proof")` unconditionally. It never reads `board.docs` and never calls `resolveGates`.

### The two symmetric wrongs

1. **False rejection.** A legitimate last-stage reorder is refused with a "proof.md is missing" offender for a ticket whose area actually gates on something else. The error tells the user to call an MCP tool that's not what their configured gate needs, and (for a GUI reorder via Settings save) an MCP tool the human can't invoke at all.
2. **False acceptance / grandfathering.** On a board where `proof.md` happens to exist but a per-area gate requires something else (e.g. `verification-screenshots.md`), the guard passes and lets the last-stage change through. Those tickets now sit in the new final stage never satisfying their *real* gate — the exact grandfathering hazard the guard exists to prevent.

### Step-by-step proof (false rejection)

1. A board defines a `ui` area with `board.docs.areas.ui.gates = [{ needs: "verification-screenshots", before: { enter: "done" } }]`, dropping the default proof-gate for that area.
2. Ticket `UI-001` is in `ui`, in stage `verifying`, with `verification-screenshots.md` written (no `proof.md`). The routine `moveItem(UI-001, "done")` via `assertDocGate` allows it.
3. The board owner reorders stages such that the final stage id changes (say to `shipped`). `setBoard` calls `assertFinalStageProven("shipped")`.
4. Any UI ticket in the new final stage — whose area-configured gate is satisfied — is checked for `proof.md`, which doesn't exist → pushed to `offenders`.
5. `setBoard` throws with a factually wrong offender list and a fix-hint naming the wrong doc.

### Step-by-step proof (grandfathering)

1. Same `ui` area gate. Ticket `UI-002` is created directly in `done` (creation is ungated — D6), with `proof.md` accidentally written but no `verification-screenshots.md`.
2. Reorder makes `shipped` the new final stage. The guard finds `proof.md` → offenders stays empty → accepted.
3. `UI-002` sits in `shipped` with its per-area gate never satisfied — the invariant `setBoard` is meant to preserve was breached.

### Why existing code doesn't prevent it

`assertDocGate` handles move-time transitions correctly but is not called from the `setBoard` invariant path. `assertNoStrandedColumns` (:210-236) only guards column *removal*. No other `setBoard` check sees the doc model.

### Impact

Bounded to `setBoard` callers with the last-stage id changing (MCP `reorder_columns`/`add_column`/`remove_column` shifting the tail, GUI Settings save, migration prefix pinning). Default boards use `proof` and are unaffected until a user customises `board.docs`. Not data-corrupting.

## Fix

Replace `assertFinalStageProven(stageId)` with a version that mirrors `assertDocGate`'s model: iterate the same non-archived occupants, but for each ticket resolve `resolveGates(board, item.area)`, evaluate the `enter: <newLast>` subset via `evaluateGates` (`hasDoc` on files in the ticket dir, `repoDocSatisfied` honouring `refs`/`docs_todo`), and aggregate real offenders per gate. Error text should list the actual missing docs per ticket; mirroring `assertDocGate`'s message shape keeps App.tsx's `friendlyGateError` mapping working. Since the two shapes are now identical modulo the enter-newLast filter, most of the code can be shared.

## Resolution plan

1. Change `setBoard` to pass the proposed `BoardConfig` into the invariant. The
   current helper otherwise cannot resolve proposed per-area gates or ordering.
2. Extract the document/repo-doc presence collection and violation formatting
   from `assertDocGate` so transition and board-invariant paths share one policy
   implementation.
3. For every non-archived v2 ticket occupying the proposed final stage, evaluate
   the area's complete configured gate set against the proposed status ordering
   and the threshold needed to reach that stage from its immediate predecessor.
   This includes earlier thresholds crossed by a jump, `leave` and `enter` rules,
   repo-doc/`docs_todo` rules and inert missing-stage rules.
4. Aggregate violations by ticket and actual missing requirement. Do not mention
   `proof.md` unless the resolved violation requires `proof`; retain the existing
   refusal-before-write atomicity.
5. Update comments and AGENTS wording that claim an unconditional literal proof
   policy so they describe “configured gates for the final-stage boundary.”
6. Add core tests: default proof refusal/success; custom area doc success and
   failure; repo-doc with and without `docs_todo`; a `leave` threshold; an inert
   gate; archived and legacy occupants; board remains byte-identical on refusal.

```diff
-await this.assertFinalStageProven(nextLast);
+await this.assertFinalStageGates(board, nextLast);
```

Acceptance: board reordering gives the same answer and missing-requirement text
that a corresponding configured transition would give, without changing D6.

## Remediation evidence

Remediated on PR #5 (`2780042`): final-stage writes evaluate resolved configured
gates, including an area-specific final-boundary gate and atomic rejected write. Core store suite: 67 passed.
