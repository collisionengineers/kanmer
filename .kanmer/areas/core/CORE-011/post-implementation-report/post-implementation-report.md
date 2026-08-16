# Post-implementation report

Commit `b5b332e` on `core-011-one-gate-per-move`.

## What shipped, and what did not

**Shipped:** one gated boundary per move, and `stageEntered` as committed
history.

**Not shipped, and this is the headline:** both rules the ticket proposed. R2
(document must predate the transition) is unimplementable — the activity log is
gitignored and git carries no mtimes, so neither timestamp survives a clone, and
even with both committed the board records nothing about when the *code* was
written, so it cannot tell code-then-plan from plan-then-code. R1 as written
(`done` only from `verifying`) contradicts the shipped `spike`-straight-to-Done
acceptance case.

The rule that replaced them is structural rather than forensic, which is why it
is trustworthy: there is no timestamp to be wrong about.

## File changes

| Path | Change |
|---|---|
| `gates.ts` | `gatedBoundariesCrossed`, `collapsesPipeline`. |
| `store.ts` | Refusal in `assertDocGate` **before** the missing-document check; `stageEntered` stamped in `updateItem` after the gate. |
| `types.ts`, `frontmatter.ts` | `stageEntered` on the schema and in `KEY_ORDER`. |
| `gates.test.ts` | **New** — the profile matrix, 7 tests. |
| `store.test.ts` | 3 new; 1 existing rewritten (see below). |
| `smoke.mjs` | 3 new checks; 1 existing corrected. |
| `FRD-002` | G2a/G2b. |

## Against the governing docs

**FRD-002 G2** is amended, not violated — G2a narrows the jump G2 permits, and
the amendment states why, with the rejected alternatives recorded so they are
not re-proposed. **PRD-001 problem 1** is the thing being fixed.

## Two existing assertions were wrong and are now corrected

**`store.test.ts` "a proof-gated positioned move…"** asserted a `fix` ticket's
Backlog→Done jump fails with "leaving Preparing requires files, plan". That jump
is now refused earlier by the collapse rule. Its real invariant — a refused
positioned move leaves siblings' `order` untouched — is preserved by making it a
single-gate move that fails on a missing document.

**`smoke.mjs` "a multi-stage jump is refused by the FIRST unmet boundary"**
kept passing after the change, because it matched on `"leaving Backlog"` and the
collapse message happens to contain that phrase in its boundary list. It was
passing for the wrong reason. Rewritten to assert the collapse explicitly.

## Risks and follow-ups

**This is a behaviour change on a live board.** Any caller doing a legitimate
multi-gate jump now fails. Searched: the GUI moves one stage per drag, and the
skills move one stage per phase. The MCP tool description for `move_item` still
describes the old freedom and should be updated — ADR-0009 makes tool
descriptions a contract layer, so that belongs with the Phase 6 skill sweep
rather than here.

**`stageEntered` does not backfill.** Tickets already Done have no history, and
inventing one would be fabrication. It starts recording from this commit.

## What kanmer-verify must run, and why it cannot be trusted from the worktree

The per-ticket worktree links the root `node_modules`, which makes
`@kanmer/core` resolve to the **main checkout**. Cross-package builds in a
worktree therefore bundle the wrong source — `mcp-server`'s dist was built
without this change and the new smoke checks failed against stale code. Vitest
is unaffected (relative imports).

So verification must run on the merged base in the main checkout:

1. `npm run build` then `npm run test` — core and gui
2. `node packages/mcp-server/src/smoke.mjs` — the 3 new checks must pass, and
   the corrected one must fail for the right reason if reverted
3. `npm run smoke:protocol`
4. `npm run plugin:build` + `plugin:check` — core compiles into the bundle
5. `typecheck` + `build` for the GUI, and the boot smoke
