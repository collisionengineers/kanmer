# Files — CORE-117

## Where the change lands

| Path | Why |
|---|---|
| `packages/core/src/profiles.ts` | Add `capture` to `DEFAULT_PROFILES` (empty map, like `custom`) and a `CAPTURE_PROFILE_ID` constant plus an `isCaptureProfile`/`isCapture` predicate other modules import instead of comparing strings. Risk: the doc comment above `DEFAULT_PROFILES` promises four profiles and must be corrected, or it becomes a lie the next reader trusts. |
| `packages/core/src/board.ts` | Add `injectCaptureProfile`, modelled on `injectFixEnterReview` (`:80-96`), inside `resolveProfiles` (`:142`) so boards that already carry a `profiles:` block gain `capture`. Must run **before** the `questions-resolved` pass and be a no-op when the board already declares `capture`. Risk: injecting a profile that declared boundaries would change `collapsesPipeline` arithmetic — an empty map declares none, and a test must pin that. |
| `packages/core/src/types.ts` | `ItemFrontmatterSchema` (`:404-501`) gains `capture_evidence?: string[]`, `capture_actor?: string`, `capture_disposition?: string`, `capture_result?: string`, `capture_decided_at?`, `capture_decided_by?`. `ItemFilter` (`:510`) gains `profile?: string`. `CreateItemInput` (`:525`) and `UpdateItemPatch` (`:552`) gain the capture fields. Risk: every field must be optional or v0.3.12-written tickets fail to parse. |
| `packages/core/src/frontmatter.ts` | Add the six `capture_*` keys to `KEY_ORDER` (`:5-46`), after `deployment` and before `archived`. Risk: omitting them serialises at the tail and trips the ordering assertion in `claims.test.ts:314`. |
| `packages/core/src/store.ts` | (a) `createItem` (~`:684-764`): refuse a capture with a blank title or blank body; stamp `capture_actor`; persist `capture_evidence`. (b) `updateItem` (~`:786-864`): refuse blanking a capture's body; validate and record a promotion atomically; derive the link/archive implied by the disposition. (c) `assertMoveAllowed` (~`:2040-2060`): refuse any target stage other than `backlog` for a capture. (d) `takeTicket`: refuse a capture. (e) `matchesFilter` (`:2385`): honour `filter.profile`. Risk: (b) and (d) write inside `withLeaseLock` (AGENTS.md §8 gotcha 17) — no new writer outside it; `assertMoveAllowed` is deliberately outside the lock and must stay there. |
| `packages/core/src/group-members.ts` | `deriveMembers` (`:4-10`) must not count captures in `total`/`complete` while still listing them. Risk: a naive filter drops them from the member list entirely and they vanish from the group view. |
| `packages/mcp-server/src/index.ts` | `createFields` (`:424-460`) and `update_item`'s `inputSchema` (`:1367-1400`) gain the capture keys — the MCP boundary is an explicit key list, so a core field is invisible over the wire until added. `list_items` (`:790`) and `search_items` (`:1047`) gain `profile`. `summarise` (`:383-409`) emits `capture` and `capture_disposition`. Profile description strings at `:435` and `:1377` gain `capture`. Risk: adding a *tool* here would move the count 39→40; this change deliberately adds none. |
| `packages/mcp-server/src/execution-packet.ts` | Extend the `gates.profile === "spike"` refusal (`:495-497`) to captures with its own reason code. Risk: `missingRequirements` (`:409-413`) only reads `leave-preparing`, so an empty profile otherwise reports "ready". |
| `apps/gui/src/renderer/src/lib/standup.ts` | Exclude captures from the `active` set used for Flags (`:165-182`) and "Up next" (`:187-195`) — the three places a capture leaks into the GUI's stale/next reporting. Risk: excluding them from `active` wholesale may also remove them from counts that should still see them; scope the exclusion to the two sections FRD-032 names. |
| `apps/gui/src/renderer/src/components/Editor.tsx` | `PROFILE_IDS` (`:26`) gains `capture`, or a capture ticket's profile select renders a value it does not contain. |
| `apps/gui/src/renderer/src/components/TicketCreate.tsx` | `PROFILE_IDS` (`:5`) gains `capture` — this is what makes acceptance 1 true for a GUI user, not just an MCP caller. |
| `plugins/kanmer/skills/kanmer-tickets/SKILL.md` | Line 56 (`"Quick-filed tickets default to docs_todo"`) is the only instruction in the system that would give a capture document debt. Replace with the capture route, and document promotion. |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | Document the new `create_item`/`update_item`/`list_items` fields. Pinned by `scripts/check-plugin-sync.mjs:71`. |
| `plugins/kanmer/skills/kanmer-auto/SKILL.md` | Roster section (`:49-81`) gains "drop captures" alongside archived/blocked. The mechanical refusals make this a description rather than the enforcement. |
| `plugins/kanmer/skills/kanmer-report/SKILL.md` | "Up next" (`:41`) and Flags (`:45`) exclude captures. |
| `plugins/kanmer/skills/kanmer-groom/SKILL.md` | The board-vs-reality sweep (`:31-44`) over non-archived Backlog/Preparing tickets excludes captures; doc-gate debt (`:23`) never applies to one. |
| `docs/manual/profiles.md` | "The four that ship" table and prose gain `capture` and the promotion decision. |
| `packages/core/src/capture.test.ts` (new) | All new core tests. **Deliberately a new file:** CORE-128 is concurrently editing `io.test.ts`, `docs.test.ts`, `migrate.test.ts` and `store.test.ts`. |
| `packages/core/src/__snapshots__/profile-matrix.test.ts.snap` | Adding a profile adds rows to the matrix snapshot. Regenerate, do not hand-edit. |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | Committed build artifact; core compiles into it, so `npm run plugin:build` is mandatory (AGENTS.md §8 gotcha 8) and must run at the **repo root**, never in `.worktrees/core-117`. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `packages/core/src/board.ts:60-140` | The two injection precedents and the exact ADR-0011 rule they are constrained by: an injection must not change a profile's *gated-boundary count*, because `collapsesPipeline` counts them. It also states why injection beats migrating `board.yml` (the requirement must still show up in `get_doc_gates`). |
| `packages/core/src/gates.ts:127-218` | Why `capture: {}` needs no gate-engine change: `if (!reqs.length) continue` skips the boundary entirely, and `gatedBoundariesCrossed` filters on `requirements.length > 0`. Also why a capture would otherwise be movable Backlog → Done in one hop. |
| `packages/core/src/profiles.ts:189-197` | `requirementsFor` returns `{}` for an unknown profile id instead of throwing — this is what makes a `profile: capture` ticket readable by the installed v0.3.12 server. |
| `packages/core/src/store.ts:2325-2344` | `assertProfileAgainstBoard` runs only when a write *names* `profile`. So v0.3.12 can edit a capture's other fields but cannot set `profile: capture` itself. Record this in the report; do not try to fix it. |
| `packages/core/src/types.ts:404-409` and `frontmatter.ts:64-74` | `.passthrough()` plus the "preserve extra keys" loop — the guarantee that additive optional frontmatter survives a round trip through the stable server. Verified against the `v0.3.12` tag. |
| `packages/core/src/reconciliation.ts:44-150` | Every branch keys on `review`/`verifying`/`done` or on `hasClaim`; a claimless Backlog capture already yields `NO_RECONCILIATION_NEEDED`. Do not add capture handling here — it would be dead code. |
| `packages/core/src/staleness.ts:898` | Repo-**artefact** staleness, not ticket staleness. It never reads a ticket. The ticket's own design guidance pointed here; measuring it showed otherwise. `skillRows` (`:391`) also explains why a SKILL.md edit must land in `plugins/kanmer/skills/`. |
| `packages/core/src/types.ts:739-830` | `leaseState`/`claimState` only ever run for a ticket with `taken_at`, which is why refusing `takeTicket` on a capture is what actually delivers FRD-032's "never appears as an expired claim". |
| `AGENTS.md` §8 gotchas 8, 17, 18 | 8: the plugin bundle is a committed artifact, core compiles into it, and building it inside a worktree silently bundles *main's* core. 17: every ticket write goes through `withLeaseLock`; `moveItem` keeps `assertMoveAllowed` outside it. 18: CORE-124's batch is the house precedent for additive frontmatter with **no new tool**. |
| `packages/mcp-server/src/execution-packet.ts:495-497` | The `spike` refusal is the shape to copy for a capture refusal. |
| `packages/core/src/gates.test.ts:70-77` | Pins that an explicitly declared empty requirement list stays vacuous — the invariant `capture: {}` depends on. |
| `docs/functional/frd/FRD-002-requirement-profiles.md`, `docs/architecture/adr/ADR-0011`, `ADR-0014` | The authority for the profile model and for what an injection may and may not do. |

## Ripple effects

- **Tests:** `profile-matrix.test.ts` snapshot grows by one profile's rows (regenerate). `migrate.test.ts:343` uses `toContain("spike")` and is additive, so it is unaffected — important, because CORE-128 owns that file. `board.test.ts` and `gates.test.ts` are free to extend but new coverage goes in `capture.test.ts` regardless.
- **Docs:** `docs/manual/profiles.md` is compiled into `apps/gui/src/renderer/src/manual/chapters.generated.ts` by `scripts/build-manual.mjs`; run `npm run build:manual` or `npm run verify:docs` fails on a stale generated file.
- **Plugin bundle:** `npm run plugin:build` at the repo root, then `npm run plugin:check`. `plugin:check` refuses outright inside a linked worktree, so this step cannot be completed from `.worktrees/core-117`.
- **Skills:** edits must land in `plugins/kanmer/skills/`; the copies under `apps/gui/release/win-unpacked/` and `.worktrees/*/` are build/worktree output and are not edited.
- **Tool count stays 39.** `smoke.mjs:69`, `smoke-protocol.mjs:160`, `AGENTS.md:413`, `docs/manual/connect.md:145` and the generated manual chapter are therefore untouched — and that is a deliberate design constraint, not an omission.
- **`search_items` inherits the new `profile` filter for free** because it delegates to `listItems(filter)`.

## Out of scope

- **No new MCP tool.** Promotion rides on `update_item`; the 39→40 arithmetic and its six coupled assertions are avoided on purpose.
- **No new stage, item type or `is_capture` boolean.** HZN-008 forbids new entities and ADR-0002 freezes the stages; the profile *is* the flag.
- **`packages/core/src/staleness.ts`** — repo-artefact only, measured; no change.
- **`packages/core/src/reconciliation.ts` / `packages/mcp-server/src/reconciliation.ts`** — a claimless Backlog capture already reconciles to `NO_RECONCILIATION_NEEDED`; adding a branch would be dead code.
- **Lease/claim code** — a capture can never be taken, so it can never be classified.
- **A dedicated GUI capture affordance** (a quick-capture composer, an evidence picker, a "hide captures" filter toggle in `FilterBar.tsx`). The two `PROFILE_IDS` one-liners make a capture creatable and editable in the GUI, which is what acceptance 1 needs; the richer surface is parked in `open-questions/` as a GUI follow-up.
- **`packages/core/src/io.test.ts`, `docs.test.ts`, `migrate.test.ts`, `store.test.ts` and `scripts/antigravity-plugin-config.test.mjs`** — owned by the concurrent CORE-128 lane. If a change here genuinely requires editing one of them, stop and report the overlap rather than editing it.
