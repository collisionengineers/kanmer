# Research — CORE-117: quick capture and deliberate promotion

## Question

FRD-032 wants a lightweight capture that is visible and searchable in Backlog,
owes no delivery documents, and is excluded from goal selection and readiness
metrics until an explicit, recorded promotion decision. Two things had to be
established before any plan: **what a capture is** (a new entity, a flag, or a
profile), and **where exclusion must actually bite** so that "excluded from goal
selection" is a mechanism rather than a sentence in a skill.

## Findings

### A capture must be a profile, not a new entity or a stage

- HZN-008 `context.md` non-goals forbid a global backlog, extra workflow engine
  and permanent new stages; `packages/core/src/stages.ts:24-31,111-117` makes
  the six stages and five boundaries frozen constants (ADR-0002). A capture
  therefore cannot be a seventh stage or a new item type.
- `packages/core/src/profiles.ts:118` — `ProfileMap = Partial<Record<Boundary, string[]>>`.
  `custom: {}` (`profiles.ts:159-160`) is the existing proof that a profile with
  **no** boundaries is legal and "nags about nothing".
- `packages/core/src/gates.ts:134-147` — `if (!reqs.length) continue;` a boundary
  with no requirements never enters `report.boundaries`, is never blocking, and
  every stage lands in `reachable`. `gates.ts:186-218` — `collapsesPipeline`
  counts only *gated* boundaries, so a zero-requirement profile adds none.
  ⇒ a `capture: {}` profile owes nothing at every boundary, by construction, and
  does not perturb any other profile's anti-collapse arithmetic.
- Consequence to design around: with zero gated boundaries a capture would be
  freely movable Backlog → Done in one hop (measured by
  `packages/core/src/profile-matrix.test.ts` for `custom` today). That is the
  loophole FRD-032's "promotion never silently selects a capture for autonomous
  delivery" is about, so the refusal must be explicit and not left to the gate
  engine — see Implications.

### Editing `DEFAULT_PROFILES` alone would not reach this board

- `packages/core/src/board.ts:142-144` — `board.profiles ?? DEFAULT_PROFILES` is a
  **whole-table replacement**, not a merge. Once a board has been written by
  setup or migration it carries its own `profiles:` block and the shipped
  defaults are never consulted again (comment at `board.ts:104-115`).
- Confirmed against the live board:
  `.worktrees/kanmer/.kanmer/data/board.yml:26-54` lists exactly
  `feature/fix/chore/spike/custom` and **no** `capture`.
- The sanctioned way to reach existing boards is a read-time injection in
  `resolveProfiles`. `injectFixEnterReview` (`board.ts:80-96`, authorised by
  ADR-0014) is the precedent: narrow, no-op when the board already says
  something, applied before the `questions-resolved` pass. ADR-0011's limit
  (`board.ts:120-138`) is about not changing a profile's *gated-boundary count*;
  a `capture: {}` entry declares no boundaries, so it is safe on that axis and
  needs no new ADR — FRD-032 is the authorisation.
- `packages/core/src/board.ts:155-160` — the `questions-resolved` pass requires
  `reqs.length`, so a `capture: {}` profile inherits nothing from it.

### Profile ids are validated on write; unknown ids read as "no requirements"

- `packages/core/src/store.ts:2325-2344` `assertProfileAgainstBoard` rejects any
  profile id that is not a key of `resolveProfiles(board)` (plus literal
  `custom`). Called from create (`store.ts:684`) and from update **only when the
  patch names `profile`** (`store.ts:793-794`).
- `packages/core/src/profiles.ts:189-197` `requirementsFor` returns `{}` for an
  unknown id rather than throwing.
- **v0.3.12 compatibility:** the installed stable server serving the live board
  has no `capture` key, so it reads a `profile: capture` ticket as
  zero-requirement (forgiving read path) and only refuses if someone re-sets
  `profile: capture` *through it*. Editing other fields never revalidates the
  profile. Captures are therefore readable and editable by the live server; they
  can only be **created** by the candidate build. Recorded, not fixed.

### New optional frontmatter is safe for the stable reader

- `packages/core/src/types.ts:404-501` — `ItemFrontmatterSchema` ends with
  `.passthrough()`; `packages/core/src/frontmatter.ts:64-74` `orderKeys`
  preserves unknown keys after the known ones.
- Verified against the tag rather than assumed: `v0.3.12`'s `types.ts` also ends
  `.passthrough()` and its `frontmatter.ts` carries the identical preserve loop.
  ⇒ additive optional fields round-trip through the stable server unchanged; the
  only effect is emit position (tail of the block) and benign diff churn.
- `KEY_ORDER` (`frontmatter.ts:5-46`) must gain each new key or it serialises at
  the tail; `packages/core/src/claims.test.ts:314` asserts canonical ordering.

### `docs_todo` is never set automatically — but the tickets skill teaches it

- `store.ts:755` writes `docs_todo` only when the caller passes `true`;
  `store.ts:833` clears it on `false`. Nothing defaults it.
- Only `feature` declares `leave-backlog: [governing-doc]`, so a `capture`
  profile never consults `docs_todo` at all (`store.ts:2089-2092` probe,
  `gates.ts:87-89`).
- The real leak is prose, not code:
  `plugins/kanmer/skills/kanmer-tickets/SKILL.md:56` says **"Quick-filed tickets
  default to `docs_todo`"** — exactly the delivery-document debt FRD-032 forbids.
  `kanmer-groom/SKILL.md:23` and `kanmer-report/SKILL.md:45` then surface
  `docs_todo: true` as tracked debt. The skill must route quick-filed
  observations to `profile: capture` instead.

### `packages/core/src/staleness.ts` is NOT ticket staleness

- It is the **repo artefact** detector behind `get_status.repo`
  (`staleness.ts:898` `detectStaleness`; artefacts `agents-block`, `skills`,
  `skills-stamp`, `board-config`, `mcp-registration`). It never reads a ticket,
  a stage or a profile. **No capture work belongs here** — the ticket's design
  guidance pointed at this file, and measuring it showed the guidance was wrong.
- Note for later: `staleness.ts:391` `skillRows` hashes the *installed* skills
  tree against the bundled one, so a SKILL.md edit that does not reach
  `plugins/kanmer/skills/` shows up as `behind` in `get_status`.

### Where "stalled planned ticket" and "readiness" actually live

- **Stalled/stale reporting** is `apps/gui/src/renderer/src/lib/standup.ts`
  (`buildStandup` at `:86`, `STALE_MS = 7d` at `:41`, `TAKEN_STALE_MS = 3d` at
  `:43`) plus its prose twins `kanmer-report/SKILL.md:41,45` and
  `kanmer-groom/SKILL.md:23,31-44`. Three concrete leaks in `standup.ts`: the
  `active` set (`:88`, `!archived && type === "ticket"`), the Flags loop
  (`:165-182`, emits "has not changed since …" and "has no area"), and "Up next"
  (`:187-195`, first-stage slice — pure Backlog, where every capture lives).
- **Readiness** is `packages/core/src/gates.ts:127` `evaluateGateReport`, served
  by `get_doc_gates` (`packages/mcp-server/src/index.ts:1219-1265`) and rendered
  by the GUI `ReadinessPanel` (`Editor.tsx:1451`, mounted `:884`, which already
  has a zero-requirement branch at `:1458-1464`). A `capture: {}` profile makes
  the readiness view empty *by construction* — no special-casing needed.
- **Group progress** is `packages/core/src/group-members.ts:4-10` `deriveMembers`,
  whose `total` counts every non-archived member and feeds
  `GroupView.tsx:94-106`. A capture that never reaches Done would permanently
  hold a group below 100%: this is a readiness metric and must exclude captures.

### Goal selection is prose, and has no filter that could exclude a capture

- `plugins/kanmer/skills/kanmer-auto/SKILL.md:49-81` builds the roster from
  `list_items group: "<group>"` and drops only **archived**, **blocked** and
  live-foreign-claim tickets, then routes each survivor by `get_doc_gates`.
  There is no code-side roster helper — `store.ts:2385` `matchesFilter` is the
  only server-side eligibility predicate.
- A Backlog capture with no claim passes every one of those filters. Prose alone
  is therefore not enough: an installed older skill, or an agent that skips the
  clause, still selects it. The mechanical refusals below are the real control.

### The mechanisms that can refuse delivery, and their precedents

- `packages/mcp-server/src/execution-packet.ts:495-497` already hard-codes
  `if (gates.profile === "spike") return refuse(...)` — the precedent for
  refusing a capture a work packet.
- `store.moveItem` / `store.takeTicket` are the two doors into delivery.
  AGENTS.md §8 gotcha 17: every ticket write runs inside `withLeaseLock`
  (CORE-125), and `moveItem` deliberately keeps `assertMoveAllowed` outside the
  lock — so a capture refusal belongs in `assertMoveAllowed`, alongside the
  existing gate refusal, not in a new writer.

### Nothing in reconciliation or the lease system flags a capture today

- `packages/core/src/reconciliation.ts:44` `reconcileEvidence` keys every branch
  on `status` being `review`/`verifying`/`done` or on `hasClaim`; a claimless
  Backlog ticket falls through to `NO_RECONCILIATION_NEEDED` (`:150`) with a null
  recommendation. Measured, not assumed. CORE-122 is safe for captures as built.
- Claim/lease expiry (`types.ts:739` `DEFAULT_CLAIM_EXPIRY_MINUTES = 30`,
  `:782` `leaseState`, `:815` `claimState`) is only ever computed for a ticket
  with `taken_at`; `projectRegistry.ts:242` skips items without it. A capture
  that is never taken can never appear as an expired claim — FRD-032's edge case
  "may sit in Backlog indefinitely without appearing as an expired plan or
  claim" is satisfied *provided* captures cannot be taken.

### Search and filtering are cheap to extend

- `store.ts:1959-1975` `searchItems` matches `id`, `title`, `body`, `assignee`
  and `labels` — so an observation stored in the **body** is searchable with no
  code change at all, and is visible in the stable GUI's ticket detail.
  `searchItems` delegates to `listItems(filter)`, so any new `ItemFilter` field
  is inherited automatically.
- `store.ts:2385-2393` `matchesFilter` is the one predicate; adding a `profile`
  filter is a one-line change there plus a zod key in `list_items`
  (`index.ts:790`) and `search_items` (`index.ts:1047`). `summarise`
  (`index.ts:383-409`) already emits `profile`, so a roster can already see it.

### Tool-count arithmetic argues strongly for extending, not adding

- 39 tools is asserted in `packages/mcp-server/src/smoke.mjs:69` and
  `smoke-protocol.mjs:160-161`, and stated in `AGENTS.md:413` and
  `docs/manual/connect.md:145` (which is mirrored into the generated
  `apps/gui/src/renderer/src/manual/chapters.generated.ts`).
  `scripts/check-plugin-sync.mjs:71` additionally pins
  `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` against the
  live tool names. Six coupled edits plus a plugin-bundle rebuild for one verb.
- `create_item` already takes `profile` and `body`; `update_item` already
  performs derived side effects (an `area` change moves the ticket's folder), so
  a promotion recorded through `update_item` is in keeping, not a new idiom.
  CORE-124's batch precedent (AGENTS.md §8 gotcha 18) is explicit that additive
  frontmatter with **no new tool** is the house style.

## Implications

1. **A capture is `profile: capture`** — a fifth shipped profile with an empty
   requirement map, added to `DEFAULT_PROFILES` for new boards and injected in
   `resolveProfiles` (modelled on `injectFixEnterReview`) for boards that already
   carry their own `profiles:` block. No new item type, no new stage, no
   `is_capture` boolean whose truth could disagree with the profile.
2. **The observation is the ticket body**, required non-empty for a capture at
   create and update. It is then searchable through the existing `searchItems`
   and visible in the stable GUI with zero extra work. Title + body is exactly
   FRD-032's "missing title or observation is refused".
3. **Evidence is additive optional frontmatter** (`capture_evidence: string[]`
   of URLs / repo-relative paths) — empty is valid, per the FRD edge case. Actor
   and created timestamp are `capture_actor` (stamped from the activity actor)
   and the existing `created`.
4. **Exclusion must be mechanical, not prose.** The gate engine cannot express
   it, so:
   - `assertMoveAllowed` refuses any move off `backlog` for a capture;
   - `takeTicket` refuses a capture;
   - `get_execution_packet` refuses a capture (mirroring the `spike` refusal);
   - `deriveMembers` excludes captures from `total`/`complete`;
   - `standup.ts` excludes captures from Flags and "Up next".
   The `kanmer-auto`, `kanmer-report`, `kanmer-groom` and `kanmer-tickets`
   prose then describes a rule that is already enforced, which is the right
   order.
5. **Promotion is a recorded field-set on `update_item`**, not a new tool: a
   `capture_disposition` from a closed set (`duplicate`, `already-fixed`,
   `batch`, `promoted`, `retained`, `not-required`) plus `capture_result`
   (the ticket/batch/link it resolved to), validated atomically and stamped with
   `capture_decided_at`/`capture_decided_by`. `promoted` requires the same patch
   to name a non-capture `profile` — which is exactly acceptance 4's "applies its
   selected profile and normal gate requirements only from that decision onward",
   because gates re-evaluate on the next read and nothing is applied backwards.
   A disposition is write-once except `retained`, which may be superseded.
6. **`docs_todo` needs no code change** but the `kanmer-tickets` prose does: its
   "quick-filed tickets default to `docs_todo`" instruction is the only thing in
   the system that would give a capture document debt.
7. **`staleness.ts` and `reconciliation.ts` need no change** — measured above.
   This removes roughly a third of the surface the ticket's guidance predicted.
8. **Scope is one PR.** Core (profile, fields, validation, refusals, filter,
   promotion) + MCP (three tool schemas, `summarise`) + two GUI one-liners and
   the standup exclusion + four skill files + manual/tool-reference + tests in
   **new** files. No new tool, so the 39-count arithmetic and the plugin bundle
   arithmetic stay put; the bundle still needs `npm run plugin:build` at the repo
   root because core compiles into it (AGENTS.md §8 gotcha 8).

## Open questions

Recorded in `open-questions/` — the two that shaped the design (observation in
body vs frontmatter; promotion via `update_item` vs a new tool) are answered
there with their rationale; one GUI-affordance question is parked as a follow-up.
