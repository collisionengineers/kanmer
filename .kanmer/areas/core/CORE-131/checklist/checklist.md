# Checklist — CORE-131

*One independently tickable box per ordered plan step or acceptance check.
Append progress notes rather than rewriting.*

- [ ] Step 1 — Extend `packages/core/src/types.ts`: `ReconciliationAction` gains `ROUTE_VERIFICATION_FAILURE` and `RECOVER_EXPIRED_CLAIM`; `ReconciliationRecommendation` gains `ticketId` and `revision: string | null` (keeping `advisory: true`); `ReconciliationEvidence["proof"]` gains `failureClass?`; add the apply input/result interfaces and export them from `packages/core/src/index.ts`.
- [ ] Step 2 — Extend `proofEvidence` in `packages/mcp-server/src/reconciliation.ts` to decode `failure_class`, defaulting any non-PASS record with a missing or unrecognised class to `inconclusive`, matching `kanmer-verify/SKILL.md:144` verbatim.
- [ ] Step 3 — Add the typed verification routing table to `reconcileEvidence` in `packages/core/src/reconciliation.ts` (`implementation` → implementing, `plan` → preparing, `transient` and `inconclusive` → no recommendation), inside the stage section, with the documented refusal ordering unchanged.
- [ ] Step 4 — Add the `RECOVER_EXPIRED_CLAIM` route, placed before the `dirtyWorkspace || missingWorkspace || …` stop so a **dirty** expired claim is still recoverable, and after the Review recovery routes; no recommendation for `foreign-repository`, `branch-mismatch`, `detached` or `unavailable` identity.
- [ ] Step 5 — Stamp `ticketId` and `revision` (from `store.getRevision(id)`) onto the recommendation in `collectReconciliationEvidence`/`reconcileTicket`; the pure classifier still never reads the store.
- [ ] Step 6 — Add `store.applyReconciliation` in `packages/core/src/store.ts` dispatching all six actions onto `moveItem` / `releaseTicket` / `transferTicket` with `expectedRevision`, each with its precondition re-check and a `const exhaustive: never` default; no new lock section and no read-then-write outside the lock.
- [ ] Step 7 — Write exactly one durable `## Transitions` audit line per applied action via `appendTransition`, naming the action, actor, stage from → to and controller old → new; keep `appendActivity` as a secondary index only.
- [ ] Step 8 — Add the boundary `applyReconciliation` to `packages/mcp-server/src/reconciliation.ts`: re-collect through the same `reconcileTicket`, refuse `RECONCILIATION_INCONCLUSIVE` / `REVISION_CONFLICT` / `RECONCILIATION_DRIFT` as coded `failCoded` errors, then delegate.
- [ ] Step 9 — Register `apply_reconciliation` in `packages/mcp-server/src/index.ts` through `write(...)` with `readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true`; do not hand-add `expected_project` to the schema.
- [ ] Step 10 — [pre-review] Name the production caller: the tool appears in `tools/list` as tool 40 and is reachable from a real MCP client, not only from tests.
- [ ] Step 11 — Extend `packages/core/src/reconciliation.test.ts` for every new route, each `failure_class`, the expired-dirty case, the board-worktree refusal, and an explicit assertion that the refusal ordering is unchanged.
- [ ] Step 12 — Add the **F-015 regression** to `packages/mcp-server/src/reconciliation.test.mjs`: collect, rewrite only `proof/proof.md` PASS→FAIL, then apply → `REVISION_CONFLICT` with nothing mutated.
- [ ] Step 13 — Add boundary tests for a stale `expected_revision`, a `null` recommendation, and one successful apply per action from fixture evidence (merged Review → Verifying, PASS Verifying → Done, `failure_class` implementation → Implementing and plan → Preparing, expired-claim transfer, clean terminal release).
- [ ] Step 14 — Prove AC4 in a test: an expired claim over a dirty workspace is recovered with `git status --porcelain` byte-identical before and after and nothing deleted; a live claim refuses with `CLAIM_LIVE`.
- [ ] Step 15 — Update `packages/mcp-server/src/smoke.mjs`: `39 → 40` at :69, add `apply_reconciliation` to the roster list at :72, assert its annotations, assert a stale `expected_revision` is refused and mutates nothing, and keep CORE-122's byte-identical dry-run proof passing (AC1 regression).
- [ ] Step 16 — Update `packages/mcp-server/src/smoke-protocol.mjs:160-161`: `39 → 40` in both the message string and the predicate.
- [ ] Step 17 — Update `AGENTS.md`: §4 line 413 "registers **39 tools**" → 40, §8 item 19's "(roster stays 39)" parenthetical, and add a §8 note describing the apply contract (revision-bound, re-collect-then-refuse, `## Transitions` audit, no new authority).
- [ ] Step 18 — Update `docs/manual/connect.md:145` ("all 39 tools" → 40), then regenerate `apps/gui/src/renderer/src/manual/chapters.generated.ts` with `npm run build:manual` and commit the generated file.
- [ ] Step 19 — Add the `apply_reconciliation` row to the write-tools table in `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` and correct the `reconcile_ticket` row's now-false "There is no apply surface" sentence.
- [ ] Step 20 — [pre-review] Rebuild and re-commit the plugin bundle (`npm run plugin:build`), then prove `npm run plugin:check` passes — it byte-compares `plugins/kanmer/mcp/kanmer-mcp.cjs` and re-handshakes an isolated server for its tool count.
- [ ] Step 21 — [pre-review] Run the exact commands without weakening assertions: `npm test -w @kanmer/core -- reconciliation`, `node --test packages/mcp-server/src/reconciliation.test.mjs`, `npm run typecheck`, `node packages/mcp-server/src/smoke.mjs`, `npm run smoke:protocol`, `npm run verify:docs`.
- [ ] Step 22 — [pre-review] Run the full rail `npm run verify` from the normal checkout at `C:\Users\Alex\Documents\GitHub\kanmer` (never a linked worktree — `plugin:check` refuses there) and record its exit evidence.
- [ ] Step 23 — [pre-review] Confirm nothing under `.worktrees/kanmer`, `.worktrees/core-116` or `.worktrees/core-128` was created, switched, written or removed, and that `kanmer-board` was not committed or pushed.
- [ ] Step 24 — [pre-review] Write the post-implementation report summarising the verification above, including the F-015 regression evidence and any deviation.
- [ ] Step 25 — [pre-review] Stop at the approved boundary: open the PR with its `Kanmer: CORE-131` footer and leave the ticket in Review. Do not review, do not merge, do not start another ticket.

`[pre-review]` and `[post-merge]` are plain-text labels for humans and skills.
Current gates ignore these labels; use `get_doc_gates` for live gate behaviour.

## Progress notes

Append with `set_ticket_doc(doc: "checklist", append: true)`.
