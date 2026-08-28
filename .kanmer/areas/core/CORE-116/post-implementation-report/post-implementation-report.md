# Post-implementation report — CORE-116

**Branch** `core-116-delivery-policy` · **worktree** `.worktrees/core-116` ·
**base** `origin/main` `bf0eaed4` · **commits** `3135cff9`, `9e43296e`,
`5926adea`.

## What shipped

The first half of FRD-031 — the per-project **Git delivery policy** and the
per-ticket **delivery state**. Release-channel leases, immutable candidate
identity and supersession went to [[CORE-132]] (see *Deviations*).

| File | Change |
|---|---|
| `packages/core/src/types.ts` | `DeliveryConfigSchema` (all keys optional) beside `DeploymentConfigSchema`; `delivery` on `BoardConfigSchema`; `DELIVERY_STATES` / `DeliveryState` / `isDeliveryState` / `deliveryStateRank`; `DeliveryPolicy`, `DeliveryPolicySource`, `DEFAULT_INTEGRATION_BRANCH`; a shared `DeliveryPatch` that `CreateItemInput` and `UpdateItemPatch` extend; nine optional `delivery_*` frontmatter fields |
| `packages/core/src/board.ts` | `resolveDelivery`, `deliveryPolicySource`, `deliveryTargets`, `assertDeliveryPolicy` (called from `writeBoard`); configurables doc comment updated |
| `packages/core/src/frontmatter.ts` | nine `KEY_ORDER` entries after `deployment` |
| `packages/core/src/store.ts` | `assertDeliveryAgainstBoard`, `applyDeliveryEffects`, `candidatePatternMatches`, `touchesDelivery`; wired into `createItem` and `updateItem`; `""`-clears in `changedFields` |
| `packages/core/src/merge-gate.ts` | `baseRef` on `MergeGatePrInput`; `WRONG_TARGET` code, in `SOFT_CODES`; `targetCheck` between `DEPENDENCY_BLOCKED` and the review checks; `evaluateMergeGate` resolves the policy from the fetched board |
| `packages/core/src/prompts.ts` | `DispatchTask.prompt(id, verificationTarget?)`; `NEUTRAL_VERIFICATION_TARGET`; the verify prompt and its feasibility reason stop asserting `main` |
| `packages/mcp-server/src/check-pr.mjs` | `readPrEvent` returns `base.ref` when present — no other CLI contract change |
| `packages/mcp-server/src/execution-packet.ts` | `ExecutionPacketDelivery` on `ExecutionPacketReady`; `deliveryPacket`; bounded `resolveBaseSha` (15 s / 32 KB) |
| `packages/mcp-server/src/index.ts` | `get_status.delivery`; delivery params on `create_item` and `update_item`; the `delivery` block on the item summary; the verification target passed to `dispatch_task` |
| `packages/core/src/delivery.test.ts` **(new, 50 tests)** | policy resolution, board validation, every refusal code, the FRD-031 AC fixtures, the non-gating regression, `deliveryTargets`, and the `WRONG_TARGET` matrix |
| `packages/mcp-server/src/delivery.test.mjs` **(new, 6 tests)** | `readPrEvent` plumbing and the `check-pr` CLI end to end |
| `packages/mcp-server/src/smoke.mjs` | 6 MCP checks; roster still 39 |
| `packages/core/src/merge-gate.test.ts`, `prompts.test.ts` | two ordered-check assertions **extended** with `WRONG_TARGET`; one prompt assertion re-pinned to the new exact phrase |
| `AGENTS.md`, `docs/manual/glossary.md` (+ generated mirror), `tool-reference.md`, `kanmer-execute/SKILL.md` | docs |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | rebuilt bundle |

## How it meets the governing docs

- **FRD-031** — **AC1** (main-only targets and verifies `main` at its exact
  merged SHA), **AC5** (a release-branch hotfix records its required integration
  backport), **AC2 except its immutable-candidate clause** (targets `dev`,
  proves integration, records the final release separately), and the edge case
  *"release evidence never turns an unmerged feature branch into a verified
  ticket"*. **AC3**, **AC4** and the unavailable-release-service edge case are
  [[CORE-132]]. FRD-031 was **not** edited.
- **ADR-0021** — the board stays readable by the installed stable v0.3.12:
  additive optional config, additive optional `.passthrough()` frontmatter, no
  format bump, no new on-disk artefact, no migration step. Asserted: a ticket
  that records nothing serialises byte-for-byte as before.
- **ADR-0005** — delivery state is a **non-gating** tracker, like `deployment`.
  `grep -n "delivery_" packages/core/src/gates.ts packages/core/src/profiles.ts`
  returns nothing (the three `profiles.ts` hits for the word "delivery" are
  pre-existing capture-profile prose). A ticket recording
  `production-verified` with no `proof` is still refused entry to Done — tested
  in core and in smoke.
- **FRD-030 / FRD-029** — no ownership model added or forked; every write goes
  through existing `KanmerStore` methods, so it is already inside
  `withLeaseLock`, and `expected_revision` / `expected_project` are unaffected.
- **Kanmer's own policy is unchanged.** Its board gains no `delivery:` block —
  the resolved default *is* main-only — and `.github/workflows/*.yml` and
  `scripts/release*.mjs` are untouched. With no block, `WRONG_TARGET` passes on
  every PR into `main`, so this repository sees no behaviour change.

## Commands and exit codes

Run in `.worktrees/core-116` unless noted.

| Command | Exit | Result |
|---|---|---|
| `npm run typecheck` | 0 | all four workspaces named and clean |
| `npm test -w @kanmer/core` (in the rail) | 0 | **23/23 files, 549/549 tests** |
| `npm run test -w @kanmer/gui` (in the rail) | 0 | 54/54 files, 524/524 tests |
| `node --test packages/mcp-server/src/delivery.test.mjs` | 0 | 6/6 |
| `node --test packages/mcp-server/src/check-pr.test.mjs` | 0 | green (in `test:http`) |
| `node packages/mcp-server/src/smoke.mjs` | 0 | **335/335 checks** |
| `npm run smoke:protocol` | 0 | 50/50 |
| `npm run smoke:discovery` | 0 | 13/13 |
| `npm run smoke:headless` | 0 | green |
| `npm run verify:docs` | 0 | mirror + generated manual current |
| `npm run verify:skills` | 0 | ALL CHECKS PASSED |
| `npm run verify:agents-block` | 0 | 31/31 |
| `npm run mcpb:check` | 0 | 3 files, 1 718 038 bytes |
| `npm run plugin:check` | 0 | **39 tools, bundle bytes match** |
| `npm run verify` (full rail) | **1** | aborted at `npm test` on the two recorded antigravity EBUSY quirks — see below |

**The one `verify` failure is a recorded host quirk, not this change.**
`scripts/antigravity-plugin-config.test.mjs` failed twice with
`EBUSY: resource busy or locked, rmdir '…\Kanmer Test Space\Kanmer\bin'` — the
"antigravity EBUSY ×2" quirk tracked as **CORE-128**, in a file this lane is
forbidden to edit. Everything else inside `npm test` passed (121 script tests:
119 pass, those 2 fail), and every rail step the abort skipped was then run
individually with exit 0 (rows above). Nothing in this diff is anywhere near the
installer shim. **Hosted `verify` is authoritative** — please read the CI result
rather than this local one.

The first rail run also hit the "core 5 s timeout" and "teardown ENOTEMPTY"
quirks in `claims.test.ts` (CORE-128); both cleared on the second run, which
recorded 549/549.

## Deviations from the plan

1. **Scope split (planned and authorised).** Research found FRD-031 spans two
   approved phases of the fixed product direction, so release-channel leases,
   immutable candidate identity, supersession, `RELEASE_CHANNEL_HELD` and the
   bounded retry schedule became **[[CORE-132]]**, which this ticket blocks.
   Recorded in `open-questions` Q1 and in the ticket body; FRD-031 unedited.
   The ticket was **retitled** from "…, delivery state and release-channel
   leases" to "…delivery policy and delivery state" to match.
2. **`deliveryTargets` was added to core, which the plan did not name.** The
   hotfix rule was about to exist three times (merge gate, execution packet,
   backport derivation). It is now one exported function all three call, so
   they cannot disagree about what a hotfix is.
3. **The packet's unit tests moved to core.** `execution-packet.ts` is not a
   tsup entry, so a `.mjs` test cannot import `deliveryPacket` without changing
   the build's entry list. Rather than reshape the published package for a
   test, the pure target logic moved to core (`deliveryTargets`, fully tested
   there) and the packet block is covered end-to-end through the real MCP
   server in `smoke.mjs` — a better production-caller proof than the unit test
   would have been.
4. **`DELIVERY_SHA_INVALID` was added** (the plan named five refusal codes).
   "Not a 40-character SHA" is a different mistake from "no SHA at all" and
   deserves its own message; `delivery_release_branch` is validated against the
   declared release branch for the same reason.
5. **`create_item` also accepts the delivery fields.** The plan implied
   `update_item` only, but an import/backfill must be judged by exactly the
   rule an update is, so both call the same merged-record validator.
6. **Two existing test files were touched** — `merge-gate.test.ts` (two ordered
   `checks[]` assertions **extended** with `WRONG_TARGET` in position) and
   `prompts.test.ts` (one assertion re-pinned from the loose `/merged main/`
   to the exact new phrase, i.e. tightened). Neither is one of the five files
   CORE-128 owns, and no assertion was weakened.
7. **`packages/mcp-server/package.json`** gained `src/delivery.test.mjs` in
   `test:http`; a test the rail does not run is not a test.
8. **`npm run build:manual`** was run because the glossary changed
   (`check:manual` is a rail step).
9. **`plugin:check` ran in the worktree, not the main checkout.** Its guard
   refuses a checkout that does not own its `@kanmer/core` resolution — its own
   comment says asking git about worktrees was only a proxy for that property.
   `npm install` was run in `.worktrees/core-116`, so it owns core and the
   check is meaningful: it reported 39 tools and matching bundle bytes.
10. **A late correctness fix** (`5926adea`): on a main-only project
    `delivery_branch === releaseBranch` for every ticket, so the first
    `DELIVERY_NO_BACKPORT_REQUIRED` check would have accepted a
    `delivery_backport_sha` that could never mean anything. Both the derivation
    and the refusal now go through `deliveryTargets`, which knows a hotfix
    needs the two branches to *differ*. Covered by a named test.

## Risks and follow-ups

- **A `delivery:` block in `board.yml` is strippable by a server that predates
  this change** (`BoardConfigSchema` is a plain `z.object()`; the GUI Settings
  save is a whole-board write). Recorded as AGENTS.md §8 gotcha 20 and
  `open-questions` Q2, where the sidecar alternative is named. Three things keep
  it loud rather than silent: the default is main-only, `get_status.delivery.source`
  distinguishes `board` from `default`, and `WRONG_TARGET` fails the next PR.
  **Kanmer's own board carries no block, so its exposure is nil.**
- **Delivery records are not revalidated when a policy later changes.** Renaming
  an integration branch leaves historical `delivery_branch` values as they were.
  That is deliberate — history is history — but a reviewer should agree.
- **`WRONG_TARGET` is soft by default.** Turning on `KANMER_GATE_STRICT` makes
  a mistargeted PR block; check the level matrix before any repository does.
- **CORE-132 inherits one constraint**: `delivery_candidate` must match the
  project's `releaseCandidatePattern`, so minted candidate identities have to be
  refs of that shape.
- No new tickets beyond [[CORE-132]].

## For `kanmer-verify`

At the merged SHA, on `main`: `npm run typecheck`, `npm test -w @kanmer/core`,
`node packages/mcp-server/src/smoke.mjs` (expect 335/335 and 39 tools),
`node --test packages/mcp-server/src/delivery.test.mjs`, and `npm run plugin:check`
from a checkout that owns its `@kanmer/core`. Treat an
`antigravity-plugin-config` EBUSY or a `claims.test.ts` timeout/ENOTEMPTY as the
CORE-128 host quirks and prefer the hosted rail result.
