# Plan — CORE-117: quick capture mode and deliberate promotion workflow

## Objective

Make a Kanmer ticket recordable as a **capture** — a title plus an observation,
nothing else owed — that stays visible and searchable in Backlog, is mechanically
barred from delivery, and leaves it only through one explicitly recorded
promotion decision.

## Starting state

Verified by reading the code, not assumed (see `research/`):

- Profiles are `Partial<Record<Boundary, string[]>>` (`packages/core/src/profiles.ts:118`).
  `custom: {}` proves an empty map is legal. `packages/core/src/gates.ts:134-147`
  skips a boundary with no requirements entirely, and `gates.ts:186-218` counts
  only *gated* boundaries for anti-collapse. A `capture: {}` profile therefore
  owes nothing everywhere and perturbs no other profile's arithmetic.
- `packages/core/src/board.ts:142-144` — `board.profiles ?? DEFAULT_PROFILES` is
  whole-table replacement, so editing `DEFAULT_PROFILES` reaches new boards only.
  The live board (`.worktrees/kanmer/.kanmer/data/board.yml:26-54`) carries its
  own block with no `capture`. `injectFixEnterReview` (`board.ts:80-96`) is the
  sanctioned read-time injection precedent.
- `packages/core/src/store.ts:2018` `assertDocGate` is the **single choke point**
  for every stage change: `updateItem` (`:839`), `assertMoveAllowed` (`:1039`,
  used by `moveItem`) and `takeTicket` (`:1368`) all call it. It already has the
  resolved profile id in `report.profile`.
- `store.ts:1959-1975` `searchItems` already matches the body, so an observation
  in the body is searchable with no code change; it delegates to
  `listItems(filter)`, so a new `ItemFilter` field is inherited automatically.
- `types.ts:404-501` ends `.passthrough()` and `frontmatter.ts:64-74` preserves
  unknown keys — verified identical at the `v0.3.12` tag, so additive optional
  frontmatter round-trips through the installed stable server.
- `packages/core/src/staleness.ts` is **repo-artefact** staleness and never reads
  a ticket; `packages/core/src/reconciliation.ts:150` already returns
  `NO_RECONCILIATION_NEEDED` for a claimless Backlog ticket. Both are out of
  scope, measured rather than assumed.
- The 39-tool count is asserted in `smoke.mjs:69`, `smoke-protocol.mjs:160`,
  `AGENTS.md:413`, `docs/manual/connect.md:145` and the generated manual chapter.
  This plan adds no tool, so none of those change.

## Governing docs

- **`docs/functional/frd/FRD-032-quick-capture-and-promotion.md` — Meets.**
  - *Concise title, observation/why, optional evidence, known area, created
    timestamp/actor*: title + body (required non-empty), `capture_evidence[]`,
    the existing `area`, the existing `created`, and `capture_actor`.
  - *Visible in Backlog, searchable and filterable*: captures are ordinary
    tickets in Backlog; `searchItems` already covers the body; `list_items` and
    `search_items` gain a `profile` filter.
  - *No automatic `docs_todo`*: the `capture` profile never declares
    `governing-doc`, so the probe is never consulted, and
    `kanmer-tickets/SKILL.md:56`'s "quick-filed tickets default to `docs_todo`"
    is replaced by the capture route. Pinned by a test.
  - *Does not count as a stalled planned ticket*: excluded from `standup.ts`
    Flags and "Up next", and from `kanmer-report`/`kanmer-groom` prose.
  - *Excluded from goal selection*: enforced in `assertDocGate` and
    `takeTicket` and `get_execution_packet`, then described in
    `kanmer-auto/SKILL.md`.
  - *Excluded from readiness metrics*: a `capture: {}` profile produces an empty
    readiness report by construction, and `deriveMembers` stops counting captures
    in group `total`/`complete`.
  - *Promotion is an explicit recorded decision with six outcomes*:
    `capture_disposition` ∈ {`duplicate`, `already-fixed`, `batch`, `promoted`,
    `retained`, `not-required`} with `capture_result`, `capture_decided_at`,
    `capture_decided_by`, validated and applied atomically by `updateItem`.
  - *Promotion never silently selects a capture for autonomous delivery*: a
    capture cannot leave Backlog, cannot be taken, and cannot be issued an
    execution packet — three refusals, not a convention.
  - Acceptance 1 → steps 2, 4, 6, 9. Acceptance 2 → steps 5, 7, 8, 10.
    Acceptance 3 → step 6. Acceptance 4 → step 6 (`promoted`/`batch` require the
    same patch to name a non-capture profile; gates re-evaluate on the next read
    and nothing is applied retroactively).
- **`docs/product/prd/PRD-002` requirement 5 — Meets** via FRD-032 above.
- **`docs/architecture/adr/ADR-0011` and `ADR-0014` — Meets, does not modify.**
  ADR-0011 limits injections that change a profile's *gated-boundary count*;
  `capture: {}` declares no boundaries, so the injection changes no count. A
  test pins that the four existing profiles' matrices are unchanged.
- **No new ADR.** The design uses the existing profile mechanism and the
  existing additive-frontmatter precedent (CORE-124, AGENTS.md §8 gotcha 18);
  FRD-032 is the authorisation. Recorded in `open-questions/`.

## Required changes

**1. `capture` profile.** `packages/core/src/profiles.ts` gains
`export const CAPTURE_PROFILE_ID = "capture"`, a `capture: {}` entry in
`DEFAULT_PROFILES`, and `export function isCaptureItem(item: { profile?: string }): boolean`
(explicit `profile === "capture"`). Correct the doc comment that promises four
profiles.

**2. Injection for existing boards.** `packages/core/src/board.ts` gains
`injectCaptureProfile(base)`, applied inside `resolveProfiles` before the
`questions-resolved` pass: a no-op when `capture` is already a key, otherwise
adds `capture: {}`. Because the map is empty, the `questions-resolved` pass adds
nothing to it (`board.ts:155-160` requires `reqs.length`).

**3. Frontmatter fields (all optional, additive).**
`packages/core/src/types.ts` `ItemFrontmatterSchema`:
`capture_evidence?: string[]`, `capture_actor?: string`,
`capture_disposition?: string`, `capture_result?: string`,
`capture_decided_at?: TimestampSchema`, `capture_decided_by?: string`.
Mirrored into `CreateItemInput` (`capture_evidence` only), `UpdateItemPatch`
(`capture_evidence`, `capture_disposition`, `capture_result`) and
`ItemFilter` (`profile?: string`). `frontmatter.ts` `KEY_ORDER` gains the six
`capture_*` keys immediately after `deployment`.

**4. Observation is required.** `store.createItem`: when the *input* profile is
`capture`, a blank `title` or a blank `body` throws
`CAPTURE_OBSERVATION_REQUIRED`, and `capture_actor` is stamped from
`this.actor` when the caller supplies none. `store.updateItem`: a patch that
blanks a capture's `body`, or that sets `profile: "capture"` on a ticket with a
blank body, throws the same code. Empty `capture_evidence` is valid.

**5. Delivery refusals.** `store.assertDocGate` throws
`CAPTURE_NOT_PROMOTED` before any other check when the ticket is a capture
(`isCaptureItem(item) || report.profile === CAPTURE_PROFILE_ID`) and
`toStatus !== "backlog"`, naming promotion as the way forward. `store.takeTicket`
throws the same code for a capture even when the requested stage equals the
current one (`assertDocGate` is not reached in that case).
`packages/mcp-server/src/execution-packet.ts` extends the existing
`gates.profile === "spike"` refusal (`:495-497`) with a capture arm.

**6. Promotion.** `store.updateItem`, inside the existing `withLeaseLock`
critical section, validates a patch carrying `capture_disposition` against the
ticket **as currently stored**:

| Disposition | Requires | Derived effect |
|---|---|---|
| `duplicate` | `capture_result` naming an existing item | adds it to `links` if absent; sets `archived: true` |
| `already-fixed` | — | sets `archived: true` |
| `batch` | `capture_result` (the batch id) **and** a non-`capture` `profile` in the same patch | none |
| `promoted` | a non-`capture` `profile` in the same patch | none (`capture_result` optional) |
| `retained` | — | none; stays a capture |
| `not-required` | — | sets `archived: true` |

Every accepted disposition stamps `capture_decided_at = now` and
`capture_decided_by = this.actor`. Refusals: `CAPTURE_DISPOSITION_INVALID`
(unknown value, or the ticket is not currently a capture),
`CAPTURE_RESULT_REQUIRED`, `CAPTURE_PROMOTION_NEEDS_PROFILE`,
`CAPTURE_ALREADY_DISPOSED` (the stored disposition is set and is not
`retained` — `retained` alone may be superseded).

**7. Filtering and visibility.** `store.matchesFilter` honours
`filter.profile`. `packages/core/src/group-members.ts` `deriveMembers` still
lists captures as members but excludes them from `total`/`complete` (its item
parameter type widens by `profile?: string`).

**8. MCP surface — no new tool.** `packages/mcp-server/src/index.ts`:
`createFields` gains `capture_evidence`; `update_item`'s `inputSchema` gains
`capture_evidence`, `capture_disposition`, `capture_result`; `list_items` and
`search_items` gain `profile`; `summarise` emits `capture: isCaptureItem(item)`
and `capture_disposition`; the two profile description strings (`:435`,
`:1377`) list `capture`; the `create_item`/`update_item` descriptions state the
capture contract.

**9. GUI (minimal).** `PROFILE_IDS` in `Editor.tsx:26` and `TicketCreate.tsx:5`
gain `capture`, so a GUI user can file and edit one.
`apps/gui/src/renderer/src/lib/standup.ts` excludes captures from the Flags loop
(`:165-182`) and "Up next" (`:187-195`).

**10. Prose.** `kanmer-tickets/SKILL.md` (replace the `docs_todo` default with
the capture route; document promotion), its
`references/tool-reference.md` (new fields), `kanmer-auto/SKILL.md:49-81` (drop
captures from the roster), `kanmer-report/SKILL.md:41,45`,
`kanmer-groom/SKILL.md:23,31-44`, and `docs/manual/profiles.md` (the shipped
profile table and a promotion paragraph).

**11. Tests** — all new coverage in `packages/core/src/capture.test.ts`
(a new file: CORE-128 concurrently owns `io.test.ts`, `docs.test.ts`,
`migrate.test.ts` and `store.test.ts`). Regenerate the
`profile-matrix.test.ts` snapshot rather than hand-editing it.

## Expected files

| Action | Repo-root-relative path | Responsibility |
|---|---|---|
| Modify | `packages/core/src/profiles.ts` | `capture` profile, `CAPTURE_PROFILE_ID`, `isCaptureItem`, corrected doc comment |
| Modify | `packages/core/src/board.ts` | `injectCaptureProfile` inside `resolveProfiles` |
| Modify | `packages/core/src/types.ts` | six `capture_*` frontmatter fields; create/update/filter inputs |
| Modify | `packages/core/src/frontmatter.ts` | `KEY_ORDER` entries |
| Modify | `packages/core/src/store.ts` | observation validation, `assertDocGate`/`takeTicket` refusals, promotion, `matchesFilter` |
| Modify | `packages/core/src/group-members.ts` | captures excluded from `total`/`complete` |
| Modify | `packages/mcp-server/src/index.ts` | tool schemas, `summarise`, descriptions — **no new tool** |
| Modify | `packages/mcp-server/src/execution-packet.ts` | capture refusal beside the `spike` refusal |
| Modify | `apps/gui/src/renderer/src/lib/standup.ts` | Flags and "Up next" exclusions |
| Modify | `apps/gui/src/renderer/src/components/Editor.tsx` | `PROFILE_IDS` |
| Modify | `apps/gui/src/renderer/src/components/TicketCreate.tsx` | `PROFILE_IDS` |
| Add | `packages/core/src/capture.test.ts` | all new core tests |
| Modify | `packages/core/src/__snapshots__/profile-matrix.test.ts.snap` | regenerated, not hand-edited |
| Modify | `plugins/kanmer/skills/kanmer-tickets/SKILL.md` | capture + promotion; remove the `docs_todo` default |
| Modify | `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | new fields (pinned by `scripts/check-plugin-sync.mjs:71`) |
| Modify | `plugins/kanmer/skills/kanmer-auto/SKILL.md` | roster drops captures |
| Modify | `plugins/kanmer/skills/kanmer-report/SKILL.md` | "Up next"/Flags exclusions |
| Modify | `plugins/kanmer/skills/kanmer-groom/SKILL.md` | sweep excludes captures |
| Modify | `docs/manual/profiles.md` | shipped-profile table + promotion |
| Modify | `apps/gui/src/renderer/src/manual/chapters.generated.ts` | **generated** — `npm run build:manual`, never hand-edited |
| Modify | `plugins/kanmer/mcp/kanmer-mcp.cjs` | **committed build artifact** — `npm run plugin:build` at the repo root |
| Inspect | `packages/core/src/gates.ts`, `reconciliation.ts`, `staleness.ts` | confirm no change is needed |

## Do not modify

- `packages/core/src/io.test.ts`, `docs.test.ts`, `migrate.test.ts`,
  `store.test.ts`, `scripts/antigravity-plugin-config.test.mjs` — the concurrent
  CORE-128 lane owns them. If a change here genuinely requires one, **stop and
  report the overlap** instead of editing it.
- `.worktrees/kanmer` — never checked out, rebased, pushed or removed.
- `packages/core/src/staleness.ts`, `packages/core/src/reconciliation.ts`,
  `packages/mcp-server/src/reconciliation.ts` — measured out of scope.
- `packages/core/src/stages.ts` — stages are frozen constants (ADR-0002).
- The skill copies under `apps/gui/release/win-unpacked/` and `.worktrees/*/` —
  build and worktree output.
- Tool count assertions (`smoke.mjs:69`, `smoke-protocol.mjs:160`,
  `AGENTS.md:413`, `docs/manual/connect.md:145`) — untouched **because** no tool
  is added; if one of these needs editing, the design has drifted.

## Constraints

- **Live-board compatibility.** The live board is served by the installed stable
  v0.3.12. Only additive optional frontmatter; no board format bump; no
  `migrate_board` step. v0.3.12 reads `profile: capture` as zero-requirement and
  preserves unknown keys, but **cannot itself set** `profile: capture`
  (`store.ts:2325-2344` validates only when a write names `profile`) — record
  this in the report, do not try to fix it.
- **No new MCP tool.** The roster stays at 39.
- **Write-lock discipline** (AGENTS.md §8 gotcha 17): promotion validation and
  its derived effects live inside `updateItem`'s existing `withLeaseLock`
  section; `assertMoveAllowed` stays outside the lock as today. Add no new
  ticket-file writer.
- **Exclusion predicate.** Behavioural exclusions key on the *explicit*
  `profile: capture` field. An **area or board `defaultProfile: capture` is not
  supported** and is out of scope — say so in the manual. `assertDocGate`
  additionally refuses on the resolved id, so the delivery bar is the stricter
  of the two.
- **Never weaken a test.** Known host flakes (antigravity EBUSY, core 5 s
  timeouts, teardown ENOTEMPTY, `http.test.mjs` spawn ETIMEDOUT,
  `tunnels/readiness.test.mjs` timeout) are recorded as CORE-128, not chased and
  not worked around by relaxing assertions.
- **Generated artifacts** (`chapters.generated.ts`, `plugins/kanmer/mcp/`) are
  regenerated by their scripts; `plugin:build`/`plugin:check` must run at the
  repo root because a worktree has no `node_modules` and would bundle main's
  core (AGENTS.md §8 gotcha 8).

## Ordered steps

1. **Branch and worktree.** `git fetch origin`; create `.worktrees/core-117`
   from `origin/main`, branch `core-117-quick-capture`. Absolute paths in every
   git command.
2. **Core: the profile.** Add `CAPTURE_PROFILE_ID`, `capture: {}` in
   `DEFAULT_PROFILES` and `isCaptureItem` to `profiles.ts`; add
   `injectCaptureProfile` to `resolveProfiles` in `board.ts`. Depends on nothing.
   Expected: `get_doc_gates` on a `capture` ticket reports no boundaries.
3. **Core: frontmatter.** Add the six `capture_*` fields to
   `ItemFrontmatterSchema`, the create/update/filter inputs in `types.ts`, and
   the `KEY_ORDER` entries in `frontmatter.ts`. Depends on 2 only for the
   constant.
4. **Core: observation validation and actor stamping** in `createItem` /
   `updateItem`. Depends on 3.
5. **Core: delivery refusals** — `assertDocGate` and `takeTicket`. Depends on 2.
   Expected: `move_item` off Backlog, and `take_ticket`, both fail with
   `CAPTURE_NOT_PROMOTED`.
6. **Core: promotion** — the disposition table, its refusals and its derived
   link/archive effects, inside `updateItem`'s lock section. Depends on 3, 4.
7. **Core: filtering and group counts** — `matchesFilter` honours
   `filter.profile`; `deriveMembers` excludes captures from `total`/`complete`
   while still listing them. Depends on 3.
8. **MCP surface** — `createFields`, `update_item` schema, `list_items` and
   `search_items` `profile`, `summarise`, descriptions; the
   `execution-packet.ts` capture refusal. Depends on 2–7.
9. **Tests** in `packages/core/src/capture.test.ts`, one per acceptance
   criterion and edge case (list under Acceptance checks). Regenerate the
   profile-matrix snapshot. Depends on 2–7.
10. **GUI** — two `PROFILE_IDS` lines and the two `standup.ts` exclusions.
    Depends on 2.
11. **Prose** — four SKILL.md files, `tool-reference.md`,
    `docs/manual/profiles.md`; then `npm run build:manual`. Depends on 8.
12. **Generated artifacts and the full rail** — `npm run build`, then
    `npm run plugin:build` and `npm run verify` **at the repo root**, not in the
    worktree. Depends on 2–11.
13. **Commit, push, open the PR** with a standalone `Kanmer: CORE-117` footer;
    write the post-implementation report; move the ticket to Review.

## Acceptance checks

- **FRD-032 AC1** — `create_item(profile: "capture", title, body)` with no refs,
  no `docs_todo` and no evidence succeeds; the resulting ticket has
  `docs_todo` unset, `get_doc_gates` reports zero requirements at every
  boundary, and `search_items(query: <word from the observation>)` returns it.
  A create with a blank title, or with a blank body, is refused with
  `CAPTURE_OBSERVATION_REQUIRED`.
- **FRD-032 AC2** — a capture cannot reach Implementing: `move_item` to any
  stage but `backlog` and `take_ticket` both throw `CAPTURE_NOT_PROMOTED`, and
  `get_execution_packet` refuses. `deriveMembers` for a group containing one
  capture and one `fix` ticket reports `total: 1`. `standup.ts` puts no capture
  in Flags or "Up next".
- **FRD-032 AC3** — each of the six dispositions is accepted with its required
  inputs, stamps `capture_disposition`, `capture_result` (where applicable),
  `capture_decided_at` and `capture_decided_by`, and applies exactly its derived
  effect; `duplicate` without `capture_result` is refused, `promoted` without a
  profile change is refused, and re-deciding a non-`retained` disposition is
  refused with `CAPTURE_ALREADY_DISPOSED`.
- **FRD-032 AC4** — after `capture_disposition: "promoted"` with
  `profile: "feature"`, `get_doc_gates` reports the full `feature` pipeline and
  the ticket cannot leave Backlog without a governing doc; before that decision
  it owed nothing, and no document is demanded retroactively.
- **Edge cases** — `capture_evidence: []` and an absent `capture_evidence` are
  both valid; a capture left in Backlog for longer than the claim window is
  reported by neither `reconcile_ticket` (still `NO_RECONCILIATION_NEEDED`) nor
  any lease/claim classifier, because it can never be taken.
- **Non-regression** — the `profile-matrix` snapshot's four existing profiles
  are byte-identical after the change; only `capture` rows are added.
- **Production wiring named** — the capture profile reaches an existing board
  through `resolveProfiles` (consumed by `store.gateReport` at `store.ts:2082`
  and by `get_doc_gates` at `index.ts:1220`); the refusal reaches every stage
  change through the single `assertDocGate` choke point called from
  `updateItem:839`, `assertMoveAllowed:1039` and `takeTicket:1368`; the new MCP
  fields reach the wire through `createFields` and `update_item`'s explicit key
  list; the rebuilt `plugins/kanmer/mcp/kanmer-mcp.cjs` is what an installed
  plugin actually runs.
- Tests prove each claim with real assertions; no assertion is relaxed to make a
  known host flake pass.

## Commands

Focused, from the worktree root:

- `npm run test -w @kanmer/core -- capture.test.ts`
- `npm run test -w @kanmer/core -- profile-matrix.test.ts`
- `npm run test -w @kanmer/core`
- `npm run typecheck`
- `npm run build:manual` (after `docs/manual/profiles.md`)
- `npm run verify:docs`

Full rail, from the **repo root** `C:\Users\Alex\Documents\GitHub\kanmer` (not a
worktree — `plugin:check` refuses there, and `plugin:build` would bundle main's
core):

- `npm run build`
- `npm run plugin:build`
- `npm run verify`

Post-merge: hosted `verify` on the PR is authoritative; the local rail's known
host flakes are recorded, not chased.

## Failure and deviation rules

- Stop and report if a change turns out to require editing
  `packages/core/src/io.test.ts`, `docs.test.ts`, `migrate.test.ts`,
  `store.test.ts` or `scripts/antigravity-plugin-config.test.mjs` — the CORE-128
  lane owns them.
- Stop and report if the design starts to need a **new MCP tool**, a board
  format bump, a `migrate_board` step, or an edit to a tool-count assertion —
  each means the plan drifted from FRD-032's bounded shape.
- Stop and report a governing-document conflict rather than resolving it in
  code; a design decision that outlives this ticket becomes an ADR via
  `kanmer-docs`, not a comment.
- Record host flakes (antigravity EBUSY, core 5 s timeouts, teardown ENOTEMPTY,
  `http.test.mjs` spawn ETIMEDOUT, `tunnels/readiness.test.mjs`) with their exact
  output and move on. Never weaken or skip a test to get a green rail.
- Deviations are written into the post-implementation report with their reason,
  never applied silently.

## Stop condition

Stop when the PR is open with a standalone `Kanmer: CORE-117` footer, the
post-implementation report is written, and the ticket is in **Review**. Do not
review, merge, verify, close out, release, or touch another ticket.
