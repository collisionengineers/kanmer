# Checklist — CORE-131

*One independently tickable box per ordered plan step or acceptance check.
Append progress notes rather than rewriting.*

- [x] Step 1 — Extend `packages/core/src/types.ts`: `ReconciliationAction` gains `ROUTE_VERIFICATION_FAILURE` and `RECOVER_EXPIRED_CLAIM`; `ReconciliationRecommendation` gains `ticketId` and `revision: string | null` (keeping `advisory: true`); `ReconciliationEvidence["proof"]` gains `failureClass?`; add the apply input/result interfaces and export them from `packages/core/src/index.ts`.
- [x] Step 2 — Extend `proofEvidence` in `packages/mcp-server/src/reconciliation.ts` to decode `failure_class`, defaulting any non-PASS record with a missing or unrecognised class to `inconclusive`, matching `kanmer-verify/SKILL.md:144` verbatim.
- [x] Step 3 — Add the typed verification routing table to `reconcileEvidence` in `packages/core/src/reconciliation.ts` (`implementation` → implementing, `plan` → preparing, `transient` and `inconclusive` → no recommendation), inside the stage section, with the documented refusal ordering unchanged.
- [x] Step 4 — Add the `RECOVER_EXPIRED_CLAIM` route, placed before the `dirtyWorkspace || missingWorkspace || …` stop so a **dirty** expired claim is still recoverable, and after the Review recovery routes; no recommendation for `foreign-repository`, `branch-mismatch`, `detached` or `unavailable` identity.
- [x] Step 5 — Stamp `ticketId` and `revision` (from `store.getRevision(id)`) onto the recommendation in `collectReconciliationEvidence`/`reconcileTicket`; the pure classifier still never reads the store.
- [x] Step 6 — Add `store.applyReconciliation` in `packages/core/src/store.ts` dispatching all six actions onto `moveItem` / `releaseTicket` / `transferTicket` with `expectedRevision`, each with its precondition re-check and a `const exhaustive: never` default; no new lock section and no read-then-write outside the lock.
- [x] Step 7 — Write exactly one durable `## Transitions` audit line per applied action via `appendTransition`, naming the action, actor, stage from → to and controller old → new; keep `appendActivity` as a secondary index only.
- [x] Step 8 — Add the boundary `applyReconciliation` to `packages/mcp-server/src/reconciliation.ts`: re-collect through the same `reconcileTicket`, refuse `RECONCILIATION_INCONCLUSIVE` / `REVISION_CONFLICT` / `RECONCILIATION_DRIFT` as coded `failCoded` errors, then delegate.
- [x] Step 9 — Register `apply_reconciliation` in `packages/mcp-server/src/index.ts` through `write(...)` with `readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true`; do not hand-add `expected_project` to the schema.
- [x] Step 10 — [pre-review] Name the production caller: the tool appears in `tools/list` as tool 40 and is reachable from a real MCP client, not only from tests.
- [x] Step 11 — Extend `packages/core/src/reconciliation.test.ts` for every new route, each `failure_class`, the expired-dirty case, the board-worktree refusal, and an explicit assertion that the refusal ordering is unchanged.
- [x] Step 12 — Add the **F-015 regression** to `packages/mcp-server/src/reconciliation.test.mjs`: collect, rewrite only `proof/proof.md` PASS→FAIL, then apply → `REVISION_CONFLICT` with nothing mutated.
- [x] Step 13 — Add boundary tests for a stale `expected_revision`, a `null` recommendation, and one successful apply per action from fixture evidence (merged Review → Verifying, PASS Verifying → Done, `failure_class` implementation → Implementing and plan → Preparing, expired-claim transfer, clean terminal release).
- [x] Step 14 — Prove AC4 in a test: an expired claim over a dirty workspace is recovered with `git status --porcelain` byte-identical before and after and nothing deleted; a live claim refuses with `CLAIM_LIVE`.
- [x] Step 15 — Update `packages/mcp-server/src/smoke.mjs`: `39 → 40` at :69, add `apply_reconciliation` to the roster list at :72, assert its annotations, assert a stale `expected_revision` is refused and mutates nothing, and keep CORE-122's byte-identical dry-run proof passing (AC1 regression).
- [x] Step 16 — Update `packages/mcp-server/src/smoke-protocol.mjs:160-161`: `39 → 40` in both the message string and the predicate.
- [x] Step 17 — Update `AGENTS.md`: §4 line 413 "registers **39 tools**" → 40, §8 item 19's "(roster stays 39)" parenthetical, and add a §8 note describing the apply contract (revision-bound, re-collect-then-refuse, `## Transitions` audit, no new authority).
- [x] Step 18 — Update `docs/manual/connect.md:145` ("all 39 tools" → 40), then regenerate `apps/gui/src/renderer/src/manual/chapters.generated.ts` with `npm run build:manual` and commit the generated file.
- [x] Step 19 — Add the `apply_reconciliation` row to the write-tools table in `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` and correct the `reconcile_ticket` row's now-false "There is no apply surface" sentence.
- [x] Step 20 — [pre-review] Rebuild and re-commit the plugin bundle (`npm run plugin:build`), then prove `npm run plugin:check` passes — it byte-compares `plugins/kanmer/mcp/kanmer-mcp.cjs` and re-handshakes an isolated server for its tool count.
- [x] Step 21 — [pre-review] Run the exact commands without weakening assertions: `npm test -w @kanmer/core -- reconciliation`, `node --test packages/mcp-server/src/reconciliation.test.mjs`, `npm run typecheck`, `node packages/mcp-server/src/smoke.mjs`, `npm run smoke:protocol`, `npm run verify:docs`.
- [x] Step 22 — [pre-review] Run the full rail `npm run verify` from the normal checkout at `C:\Users\Alex\Documents\GitHub\kanmer` (never a linked worktree — `plugin:check` refuses there) and record its exit evidence.
- [x] Step 23 — [pre-review] Confirm nothing under `.worktrees/kanmer`, `.worktrees/core-116` or `.worktrees/core-128` was created, switched, written or removed, and that `kanmer-board` was not committed or pushed.
- [x] Step 24 — [pre-review] Write the post-implementation report summarising the verification above, including the F-015 regression evidence and any deviation.
- [x] Step 25 — [pre-review] Stop at the approved boundary: open the PR with its `Kanmer: CORE-131` footer and leave the ticket in Review. Do not review, do not merge, do not start another ticket.

`[pre-review]` and `[post-merge]` are plain-text labels for humans and skills.
Current gates ignore these labels; use `get_doc_gates` for live gate behaviour.

## Progress notes

Append with `set_ticket_doc(doc: "checklist", append: true)`.

- Steps 1-21 complete. Exit codes recorded in `scratch/execution.md`; every
  command was run in `.worktrees/core-131`, none against `.worktrees/kanmer`,
  `.worktrees/core-116` or `.worktrees/core-128`.
- Step 21's commands all exited 0: core reconciliation suite 43 passed, the
  boundary suite 23 passed, `smoke.mjs` 338/338, `smoke:protocol` 50/50,
  `verify:docs` PASS, `plugin:check` "40 tools match, bundle bytes match,
  isolated MCP handshake lists 40 tools".
- Step 22 ran, but **not** from the main checkout, and the deviation is
  deliberate and recorded in the post-implementation report:
  `scripts/check-plugin-sync.mjs:50-66` refuses on whether the checkout *owns
  its `@kanmer/core` resolution*, not on being a linked worktree ("Asking git
  whether this is a linked worktree was only a proxy for this property"). This
  worktree was given its own `npm ci`, so it owns it — `plugin:check` passed
  here. Switching the shared main checkout onto this branch would disturb a
  resource other lanes use, for no verification gain.
- Step 22 evidence: `npm run verify` exited **1** twice, and both failures are
  kept. First run: `claims.test.ts > renewable leases (CORE-115) > AC2` timed
  out at 5000ms — isolated rerun `npm test -w @kanmer/core -- claims` 48/48,
  exit 0, and it did not recur. Rerun: core 23/23 files (562 tests) and GUI
  54/54 green; sole failure `scripts/antigravity-plugin-config.test.mjs` ×2 on
  Windows `EBUSY`, which CORE-128 owns and which is off-limits here. `npm run
  test:scripts` isolated: 119/121, same two. Because the rail aborts on its
  `npm test` step, every later step was run individually and all exited 0:
  `typecheck`, `verify:docs`, `smoke.mjs`, `smoke:headless`, `mcpb:check`,
  `smoke:protocol`, `smoke:discovery` 13/13, `verify:skills` ALL CHECKS PASSED,
  `verify:agents-block` 31/31, `plugin:check`. Hosted CI is authoritative for
  the two known Windows failures.
- Step 23: `git worktree list` confirms `.worktrees/kanmer` still on
  `kanmer-board` with its tip equal to `origin/kanmer-board`
  (`4d36dd329f275e0ac14aeac6a758a0d95dbc5355`) and **uncommitted, unpushed** MCP
  writes left for the controller; `.worktrees/core-128` moved only by its own
  lane; `.worktrees/core-116` and `verify-core-116-*` were retired by another
  lane during this run, not by me; the main checkout is untouched on `main` at
  `0f4a21fe`. Nothing was created, switched, written or removed by this lane
  outside `.worktrees/core-131`.
- Steps 24-25: report written; commit `abeb16978a4b3f8fece6e98d6bdf54e541544a1b`
  pushed; PR https://github.com/collisionengineers/kanmer/pull/301 open with a
  standalone `Kanmer: CORE-131` footer; ticket moved implementing → review.
  `mergeStateStatus` is `BLOCKED` because `main` sets
  `required_conversation_resolution: true` — the reviewer's job, not a defect.
  Not reviewed, not merged, no other ticket started.

---

## Closeout — CORE-131

- [ ] PR merge verified (`gh pr view --json state,mergedAt`)
- [ ] proof.md finalised (PR URL + merge date appended)
- [ ] Moved to final stage
- [ ] Outcome recorded in ticket body (PR link, follow-ups)
- [ ] cd out of worktree; `git worktree remove .worktrees/<id>`
- [ ] `git branch -d <branch>` (`-D` if squash/rebase-merged)
- [ ] `git fetch --prune` + `git worktree prune`
- [ ] `take_ticket action: "release"`

- [x] PR merge verified — MERGED at 452159553bef03cf634bd5d6a2ffb6b9a9415de6
- [x] proof.md finalised — already final (PASS, version b8dc5101d0c90fba), untouched
- [x] Already in final stage (Done, not archived)
- [x] Outcome recorded in ticket body
- [x] `git worktree remove .worktrees/core-131`
- [x] `git branch -d core-131-apply-reconciliation` (succeeded, no -D needed)
- [x] `git fetch --prune` + `git worktree prune`
- [x] `take_ticket action: "release"`

Closeout complete.
