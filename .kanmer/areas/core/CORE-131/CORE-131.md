---
id: CORE-131
type: ticket
title: >-
  Add apply_reconciliation: mutating recovery on revisions and leases (FRD-028
  acceptance 2-4)
status: done
area: core
assignee: claude-code
profile: feature
stageEntered:
  preparing: '2026-08-28T04:35:34.440Z'
  review: '2026-08-28T05:37:16.430Z'
  verifying: '2026-08-28T06:09:19.286Z'
  done: '2026-08-28T06:51:48.983Z'
labels:
  - reliable-autonomy
groups:
  - HZN-008
links: []
refs:
  - docs/functional/frd/FRD-028-rescue-and-reconciliation.md
commits:
  - abeb16978a4b3f8fece6e98d6bdf54e541544a1b
  - 452159553bef03cf634bd5d6a2ffb6b9a9415de6
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/301'
archived: false
created: '2026-08-28T03:03:07.312Z'
updated: '2026-08-28T06:57:11.241Z'
---

## What

The apply half of FRD-028. [[CORE-122]] shipped the read-only inspector: `reconcile_ticket` collects board, Git, GitHub, CI, workspace and claim facts and returns typed findings plus an **advisory** recommendation, with no apply surface. FRD-028 acceptance 2 ("an explicit apply corrects only a still-current proposed action and records an audit entry; a changed revision returns a structured conflict"), acceptance 3 (routing merged-Review, PASS-Verifying, verification failures and abandoned claims to their correct stages) and acceptance 4 (dirty expired workspace preserved; cleanup only for a terminal, clean, explicitly authorised target) are all still unmet.

This is the ticket [[CORE-113]] was superseded to enable, and it is the last unfiled row of the HZN-008 breakdown. **Until it lands the horizon cannot meet its own first acceptance criterion** — "a broken or abandoned ticket state can be inspected dry-run first and safely reconciled without touching `.worktrees/kanmer` or deleting dirty work."

## Why

Everything CORE-113 lacked now exists and is merged:

- **[[CORE-114]]** gave a document-inclusive `revision` and `expected_revision` CAS. This closes CORE-113's terminal defect F-015 directly: a proof rewrite now changes the ticket's revision, so an apply that re-collects evidence and then mutates can no longer be fooled by a proof that flipped PASS→FAIL underneath it.
- **[[CORE-115]]** gave lease state (`current` / `expired`), `LEASE_LIVE`/`WORKSPACE_OCCUPIED` refusals and transfer-as-reclaim with evidence — so "abandoned claim" is now a fact the classifier can read rather than a guess.
- **[[CORE-125]]** put every ticket-file mutation under the board write lock, so an apply cannot lose a concurrent lease write.
- **[[SKILL-037]]** added `failure_class` (`implementation` / `plan` / `transient` / `inconclusive`, defaulting to inconclusive) to the proof record, which is what makes acceptance 3's typed verification routing expressible.

## Approach

- Salvage the apply half of PR #286 (`store.applyReconciliation`, the `apply_reconciliation` tool) as a starting point, but rebuild it on the contracts above rather than porting it: `expected_revision` instead of the bare `updated` CAS, the board write lock, and `leaseState` instead of the legacy claim predicate.
- Keep the CORE-122 split intact: core stays pure and classifies supplied evidence; the MCP boundary collects Git/GitHub facts; apply re-collects immediately before mutating and refuses on any drift.
- Actions limited to legal stage transitions plus claim release/transfer — `MOVE_TO_VERIFYING`, `MOVE_TO_IMPLEMENTING`, `MOVE_TO_DONE`, typed verification routing (implementation → Implementing, plan → Preparing, transient → retry in Verifying), `RELEASE_CLEAN_TERMINAL_CLAIM` and expired-claim recovery via CORE-115's transfer. No new stage, no force-push, no required-check bypass, no deletion of dirty work, no mutation of `.worktrees/kanmer`.
- Audit: record old/new responsible controller and the action durably, not only in the best-effort activity log — CORE-113's review raised this and it was never resolved.
- Roster moves 39 → 40, so every count assertion (smoke, smoke-protocol, AGENTS.md §4, `docs/manual/connect.md`, the generated manual chapter, tool-reference) and the plugin bundle must move together.

## Verification

- [ ] A dry-run still mutates nothing (regression on CORE-122's byte-identical proof).
- [ ] Apply refuses with a structured conflict when the ticket revision changed since the recommendation — including the CORE-113 F-015 case where only a proof document changed.
- [ ] Merged Review → Verifying, PASS Verifying → Done, and closed-unmerged → Implementing each apply from real fixture evidence.
- [ ] A FAIL proof routes by `failure_class`: implementation → Implementing, plan → Preparing, transient stays in Verifying.
- [ ] An expired claim with dirty work is recovered without deleting or cleaning the workspace; a live claim is refused.
- [ ] The board worktree is refused as a target in every path.

## Outcome

**What shipped:** `apply_reconciliation` — the apply half of FRD-028 and the work [[CORE-113]] was superseded to enable. Six exhaustive actions (`MOVE_TO_VERIFYING`, `MOVE_TO_IMPLEMENTING`, `MOVE_TO_DONE`, `ROUTE_VERIFICATION_FAILURE`, `RELEASE_CLEAN_TERMINAL_CLAIM`, `RECOVER_EXPIRED_CLAIM`) with a `never` default; typed verification routing on `failure_class`; the durable `## Transitions` audit record; tool roster **39 → 40** across nine sites.

**The F-015 defect that killed CORE-113 is closed, and was proved by execution twice** — once at review, once independently at verification. A proof-only rewrite leaves the ticket file byte-identical, so `updated` never moves and PR #286's CAS would still be blind today; the document-inclusive revision does move; and the stale apply is refused `REVISION_CONFLICT` with no audit line written. Controls proved the refusal *discriminates*: a current revision with a PASS proof still applies `MOVE_TO_DONE`, and a fresh revision with a FAIL proof routes to Implementing.

**FRD-028 coverage:** AC2 and AC4 met, AC1 and AC5 not regressed, **AC3 met with one known gap** — an abandoned claim whose workspace is missing or unrecorded does not route, because the `"missing"` arm of the guard is dead code. It **fails closed**: the dry run still diagnoses, apply refuses `RECONCILIATION_INCONCLUSIVE`, and the operator falls back to `take_ticket action: "transfer"` at the same authority. Owned by **[[CORE-133]]**.

**Residual risk:** the review recorded nine findings; two went to CORE-133 (R-001 major, R-002 minor), one was **rejected outright** (R-008 — `failCoded` returns `isError: true` for every coded refusal, so it described the framework rather than this change), and the rest are dispositioned accepted residual risk in attestation `f8251d2c938a287c`. R-004 (`index.ts:957` still says "there is no apply surface") has since been folded into CORE-133 as a one-liner, because the description ships in the plugin bundle and `check-plugin-sync.mjs` compares tool *names* only — no rail would ever catch it.

**Four declared deviations, all accepted by review and re-confirmed at verification:** `errors.ts` edited though absent from the plan's expected-files table (the plan names both codes; they do not typecheck without it); `npm run verify` run from the worktree, on the reading — reproduced independently — that `check-plugin-sync.mjs:49-66` guards whether a checkout *owns its `@kanmer/core` resolution* rather than whether it is a linked worktree, which the script's own comment states; `npm ci` in the worktree, required by that; and `RECONCILIATION_DRIFT` as a revision-and-stage recheck, honestly labelled belt-and-braces rather than a load-bearing guard.

**Verification note worth preserving:** local `npm run verify` failed across four same-SHA runs with **four different failing sets**, all 5s vitest timeouts and `ENOTEMPTY` teardown, never an assertion. The decisive mechanism argument was that `store.ts`'s diff **deletes zero lines** — two purely additive hunks — so no existing code path changed; both affected test files are untouched by the diff. Hosted CI at the exact merge SHA is green (run 33146971709).

**Deployment:** this board declares no deployment tracking (per CORE-116 and CORE-117 precedent) — not applicable, recorded here in prose rather than the `deployment` field.

**Merged:** PR [#301](https://github.com/collisionengineers/kanmer/pull/301), merge commit `452159553bef03cf634bd5d6a2ffb6b9a9415de6`. Independent post-merge verification: PASS, proof `b8dc5101d0c90fba`, bound to that exact SHA.
