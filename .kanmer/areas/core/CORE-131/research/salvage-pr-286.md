# Research — CORE-131: what PR #286's apply half is worth, line by line

Branch `core-113-rescue-reconciliation`, tip `db63fb4b`. Read read-only; no
checkout, no worktree, no branch created. `git diff --stat main...` shows 18
files; the apply half is `packages/core/src/store.ts` (+65) and the
`apply_reconciliation` registration in `packages/mcp-server/src/index.ts` (+30),
plus `applyReconciliation` at `packages/mcp-server/src/reconciliation.ts:261`.

## The three pieces

### 1. `mcp-server/src/reconciliation.ts:261` — the boundary apply

```ts
export async function applyReconciliation(store, input: { id; expectedUpdated; proposalId }, run?) {
  const result = await reconcileTicket(store, input.id, run);
  if (!result.proposal || result.proposal.id !== input.proposalId) throw new Error("Conflict: …");
  if (result.proposal.ticketUpdated !== input.expectedUpdated) throw new Error("Conflict: …");
  const item = await store.applyReconciliation(input.id, { expectedUpdated: input.expectedUpdated, proposal: result.proposal });
  return { result, item };
}
```

**Keep:** the shape. Re-collect via the same `reconcileTicket` used for the dry
run, compare, then delegate the mutation to core. That is the correct seam and
it is why re-collection cannot drift from what the dry run reported — it is
literally the same function.

**Reject:** `expectedUpdated` as the freshness token, and the opaque
`proposalId` hash. `updated` is a ticket-file timestamp; the whole F-015 defect
is that a proof document can change without it moving. The `proposalId` hashed
the evidence, which papered over part of the same hole but introduced a second
fingerprint to keep in sync and gave callers an unreadable token.

**Reject:** untyped `throw new Error("Conflict: …")`. `packages/mcp-server/src/errors.ts`
(`failCoded`/`KanmerError`) is how this server returns structured codes, and
FRD-028 acceptance 2 says "a changed revision returns a **structured** conflict".

### 2. `core/src/store.ts` — `applyReconciliation` on the store

```ts
async applyReconciliation(id, { expectedUpdated, proposal }) {
  const current = await this.getItem(id);
  if (current.updated !== expectedUpdated || proposal.ticketUpdated !== current.updated) throw this.conflictError(…);
  switch (proposal.action) { case "MOVE_TO_IMPLEMENTING": … next = await this.moveItem(id, { status, expectedUpdated: current.updated }); … }
  await appendActivity(this.paths, [ this.activity(id, "update", { field: "reconciliation", to: proposal.action }), … ]);
}
```

**Keep:** the per-action legality re-check against `current.status` before the
move (`MOVE_TO_DONE` is only valid from `verifying`, etc.) and the `never`
exhaustiveness default. Those are cheap and they are what stops a stale action
being replayed against a stage it no longer fits.

**Reject, in order of severity:**

- `getItem` → check → `moveItem` is a **read-then-write outside the lock**.
  CORE-125 moved every ticket writer inside `withLeaseLock`; this pre-dates it.
  The status re-check and the mutation must be one locked section, or the CAS
  must be the only guard (the store verbs already do this correctly if you pass
  `expectedRevision` and let them do the checking).
- `moveItem(id, { status: "implementing", expectedUpdated })` **with no
  `reason`**. On today's `main` this throws `BACKWARD_MOVE_NEEDS_REASON`
  (`store.ts:956`) before it can even reach the CORE-121 attestation rule. Both
  `MOVE_TO_IMPLEMENTING` routes are dead on arrival as written.
- `hasLegacyTicketClaim(current)` as the claim predicate. CORE-115 replaced this
  with `leaseState(item, now, leaseConfig(board))`; the legacy predicate cannot
  tell `current` from `expired` and so cannot express AC4 at all.
- `releaseTicket(id, expectedUpdated)` — a positional second parameter. `main`'s
  signature is `releaseTicket(id, opts: { expectedRevision?: string })`
  (`store.ts:1422`); the salvage's own `+ expectedUpdated?: string` overload
  edit must not be re-applied.
- **`appendActivity` as the audit record.** Best-effort, swallowed on error,
  and self-truncating (`activity.ts:53`, `:46-51`). This is CORE-113's
  unresolved review objection.
- No expired-claim recovery at all — the salvage has four actions and none of
  them is a transfer, so FRD-028 AC4 was never reachable from it.

### 3. `mcp-server/src/index.ts` — the tool registration

**Keep:** the annotation set — `readOnlyHint: false, destructiveHint: false,
idempotentHint: false, openWorldHint: true` — and the description's negative
space ("never deletes a worktree, force-pushes, bypasses checks or mutates the
board worktree"). Both are still true and both are asserted by smoke.

**Keep:** registering through the `write(...)` wrapper (`index.ts:562`), which
strips and asserts `expected_project`, stamps the activity actor from the
calling client and calls `ensureInit()`. Note it also causes `registerTool` to
inject `expected_project` into the input schema automatically for any tool whose
`readOnlyHint === false` (`index.ts:555-558`) — do not hand-add that field.

**Reject:** `expected_updated` and `proposal_id: z.string().length(64)` as the
input schema. Replace with `expected_revision`.

## Net assessment

The salvage is worth reading for its *shape* — collect, compare, delegate,
switch with an exhaustive default — and for its tool annotations and prose. Its
freshness token, its claim predicate, its audit sink and its lock discipline are
all superseded by contracts merged after it, and its `MOVE_TO_IMPLEMENTING`
paths no longer compile against the current backward-move rule. Treat it as a
sketch of the control flow and write the body against `main`.

Nothing on that branch should be cherry-picked. The branch is left untouched.
