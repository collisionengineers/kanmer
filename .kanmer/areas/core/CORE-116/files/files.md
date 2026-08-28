# Files — CORE-116 (bounded first part: delivery policy + delivery state)

Scope is goal.md Phase 5 / FRD-031 AC1, AC5, the non-candidate half of AC2 and
both non-release-service edge cases. Release-channel leases, immutable candidate
identity and supersession are the follow-up ticket (see `open-questions` Q1).

## Files the change touches

| File | Change | Risk |
| --- | --- | --- |
| `packages/core/src/types.ts` | `DeliveryConfigSchema` (next to `DeploymentConfigSchema` `:331-336`); `delivery: DeliveryConfigSchema.optional()` on `BoardConfigSchema` next to `deployment:` `:379`; optional `delivery_*` frontmatter fields; `DELIVERY_STATES` const + `DeliveryState` type; `DeliveryPolicy` type + defaults; `delivery` fields on `UpdateItemInput`/`CreateItemInput` | Medium — every field optional; `BoardConfigSchema` strips unknown keys, `ItemFrontmatterSchema` is `.passthrough()`, and that asymmetry is the whole design |
| `packages/core/src/board.ts` | `resolveDelivery(board): DeliveryPolicy` beside `resolveEnvironments()` `:206-209`; `assertDeliveryPolicy()` called from `writeBoard()` `:292-296` beside `assertUniquePrefixes`; update the configurables list in the doc comment at `:27-33` | Medium — read `injectCaptureProfile`/`injectFixEnterReview` rationale `:47-124` before choosing read-time vs written defaults |
| `packages/core/src/frontmatter.ts` | `KEY_ORDER` entries for the `delivery_*` keys (after `deployment` at `:48`) | Low |
| `packages/core/src/store.ts` | `assertDeliveryAgainstBoard()` modelled on `assertDeploymentAgainstBoard` `:2554-2572`; wire into `createItem` `:694,776` and `updateItem` `:806-815, 855`; `""`-clears change detection `:2583-2584` | High — the write rules are the contract; delivery must stay **non-gating** (ADR-0005) |
| `packages/core/src/merge-gate.ts` | `baseRef?: string` on `MergeGatePrInput` `:16-21`; new `MergeGateFindingCode` `"WRONG_TARGET"`; the check, warning by default and error under `strict` (CORE-123 convention) | Medium — `MergeGateFindingCode` is a public union; findings order is asserted by tests |
| `packages/mcp-server/src/check-pr.mjs` | `readPrEvent` `:31-39` also returns `base.ref`; resolve the fetched board's integration branch and pass both into the gate | Medium — event-shape validation is strict and tested |
| `packages/mcp-server/src/execution-packet.ts` | `delivery` block on `ExecutionPacketReady` `:123-151`: `baseBranch`, `baseSha` (bounded `git rev-parse`, `null`/`unavailable` on failure), `prTarget`, `verificationTarget`, resolved policy and the ticket's current delivery state | Medium — core stays git-free; the subprocess needs `timeout`/`maxBuffer` like `reconciliation.ts` |
| `packages/core/src/step-packet.ts` | **No change.** `STEP_PACKET_VERSION` stays `step-packet/1` (`:26`) — see `open-questions` Q3 | — |
| `packages/mcp-server/src/index.ts` | `get_status` gains `delivery: { ...resolveDelivery(board), source }` beside `leases:` `:683`; `update_item` gains the delivery params beside `deployment` `:1426-1429`; item view field `:403` | Medium — **no new tool**; roster stays 39 (`smoke.mjs:69`) |
| `packages/core/src/index.ts` | export the new types/resolvers | Low |
| `packages/core/src/prompts.ts` | widen `DispatchTask.prompt` to `(id, verificationTarget?)`, pass the resolved target from `index.ts:994`; `:150` and `:234-237` stop asserting `main` | Low–Medium — 4 call sites; GUI previews (`apps/gui/src/main/index.ts:1357,1362`) keep the default so the GUI is untouched. Droppable if it grows. |
| `packages/core/src/delivery.test.ts` **(new)** | policy resolution + defaults, board validation, `delivery_*` round-trip and `""`-clear, the AC1/AC2/AC5 fixtures, and the AC "delivery state is not a gate" regression | Medium |
| `packages/mcp-server/src/delivery.test.mjs` **(new)** | `check-pr` base-ref plumbing and the `WRONG_TARGET` finding at both levels | Low |
| `packages/mcp-server/src/smoke.mjs` | `get_status.delivery`, `update_item` delivery round-trip, packet delivery block; tool count stays 39 | Medium — an existing shared file; additive only |
| `plugins/kanmer/skills/kanmer-execute/SKILL.md` | branch from the packet's `baseBranch`/`baseSha` instead of `origin/main` (`:204`); `gh pr create --base <prTarget>` (`:277`) | Low — text only |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | `update_item` delivery fields; `get_status.delivery` | Low |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` (+ setup runtime) | rebuilt via `npm run plugin:build` **from the main checkout** (AGENTS.md §8 gotcha 8) | Medium |
| `AGENTS.md` | §4 board.yml + frontmatter field lists; §8 gotcha for the board.yml-strips / frontmatter-passthrough asymmetry | Low |
| `docs/manual/glossary.md` | "Delivery state" and "Integration branch" entries beside "Lease" (`:45`) | Low |

## Ripple effects

- **`MergeGateFindingCode` is a union consumed by `check-pr.mjs`'s annotation
  adapter and by `merge-gate.test.ts`.** Adding a code changes the ordered
  `checks[]` array; existing order assertions must be extended, never relaxed.
- **`plugin:check` compares bundle bytes** — any core/server change needs
  `npm run build && npm run plugin:build` from the repo root before commit.
- **`smoke.mjs:69` asserts exactly 39 tools.** If a reviewer insists on a
  dedicated delivery tool, that assertion and the tool-reference table change
  together — but goal.md's NO-CHURN rule and HZN-008's non-goals argue against it.
- `get_status` is read by `kanmer-setup`, the GUI and every skill's orientation
  step; adding a key is additive but appears in a lot of transcripts.
- `staleness.ts:516-535` reports board-config dead keys and `:545-551` the
  `compensated` state — a read-time-defaulted `delivery` belongs in
  `compensated`, not `behind`, if it surfaces there at all.
- `docs/contributing/doc-structure.md` mirror / `npm run verify:docs` only if
  `/docs/` changes (the glossary edit does).

## Out of scope (deliberately)

- **Release-channel leases, release-attempt records, immutable candidate
  identity, supersession, `RELEASE_CHANNEL_HELD`, and the bounded retry
  schedule** — the follow-up ticket (`open-questions` Q1). Part one must not
  pre-empt its on-disk format.
- **Wiring `ReconciliationEvidence.release.state`** — every non-neutral value is
  a release-attempt observation. It stays `not-applicable`
  (`packages/mcp-server/src/reconciliation.ts:311-313`), and the comment naming
  this ticket is updated to name the follow-up instead.
- **`.github/workflows/pr.yml`, `board-regate.yml`, `scripts/release*.mjs`** —
  Kanmer's own repository and publishing policy. FRD-031 forbids changing it to
  demonstrate another policy.
- **Board format bump / `migrate.ts`** — not needed (F-12).
- **`step-packet.ts` / `STEP_PACKET_VERSION`** — Q3.
- **GUI settings editing of the delivery block** — after this lands; the block
  round-trips untouched today.
- **`apps/gui/**`, `packages/mcp-server/src/http*.ts`, the endpoint registry
  beyond documenting `EndpointEntry.policy`'s meaning.**
- **The five test files CORE-128 owns** — `io.test.ts`, `docs.test.ts`,
  `migrate.test.ts`, `store.test.ts`, `scripts/antigravity-plugin-config.test.mjs`.
  New tests go in new files; stop and report if one of these must change.
- **`plugins/kanmer/skills/kanmer-groom`** — `scripts/verify-skill-prose.mjs:303`
  asserts ``/`main`\s+history/i`` there.

## Context files (read before implementing)

| File | What it tells you |
| --- | --- |
| `docs/functional/frd/FRD-031-configurable-delivery-and-release-state.md` | The contract, 5 acceptance criteria and 2 edge cases |
| `docs/architecture/adr/ADR-0021-stable-control-plane-for-candidate-work.md` | Why the stable server owns the live board while this is built |
| `docs/architecture/adr/ADR-0005-proof-not-deployment.md` | Why delivery state must be non-gating — the rule that makes FRD-031's edge case automatic |
| HZN-008 `context.md` | One writer per workspace, reuse the lease machinery, v0.3.12 stays live, non-goals |
| `goal.md:467-524` (Phase 5) and `:917-950` (Phase 14) | The approved wording, including the exact policy key names and the split |
| `packages/core/src/project.ts:5-19` | Why CORE-114 chose a sidecar over board.yml — the counter-argument to Q2 |
| `packages/core/src/board.ts:27-33, 47-124, 206-209, 281-296` | Configurables comment, why `board.X ?? DEFAULT` misses existing boards, the resolver slot, the write path |
| `packages/core/src/store.ts:2554-2572, 806-855` | `assertDeploymentAgainstBoard` — the exact template, including `""`-clears |
| `packages/core/src/types.ts:331-336, 365-394, 410-520` | `DeploymentConfigSchema`, `BoardConfigSchema` (strips), `ItemFrontmatterSchema` (`.passthrough()`) |
| `packages/core/src/merge-gate.ts:1-115` | Finding codes, `MergeGatePrInput`, `mergeGateOk`, the strict-mode convention |
| `packages/mcp-server/src/check-pr.mjs:31-39, 111` | Event parsing — `base.ref` is read and thrown away today |
| `packages/mcp-server/src/execution-packet.ts:123-151, 262-386` | Where the delivery block goes; the existing bounded-git workspace checks not to duplicate |
| `packages/mcp-server/src/reconciliation.ts:300-315` | Bounded subprocess conventions (`timeout`, `maxBuffer`) for resolving a base SHA |
| `packages/core/src/reconciliation.ts:37, 58-71` | The already-written consumer of `release.state` — proof that part two only needs a producer |
| `packages/core/src/claims.test.ts:1-50, 553-670` | Test conventions: `mkdtemp` root, `ticketFile`, gate-free `free` fixture, in-lock concurrency proof |
| `packages/core/src/migrate.ts:498-500, 567-570, 821-839` | Why no format bump, and the format-independent step pattern if one is ever needed |
| `AGENTS.md §6, §8 gotcha 8, §10` | Commands, build the bundle from the main checkout, verification checklist |
