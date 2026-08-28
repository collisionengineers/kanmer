# Post-implementation report — CORE-117

## Summary

Quick capture ships as a fifth requirement profile rather than a new entity: a
capture is an ordinary ticket carrying `profile: capture`, whose requirement map
is empty, so the gate engine asks it for nothing at any boundary. Because a gate
can only ask for *evidence* and what a capture actually needs is a *decision*,
the delivery bar is enforced explicitly rather than left to the absence of
requirements — `assertDocGate` (the single choke point `updateItem`, `moveItem`
and `takeTicket` all pass through) refuses any move off Backlog, `takeTicket`
refuses the take itself so a capture can never surface as an expired claim, and
`get_execution_packet` refuses one beside the existing `spike` refusal.
Promotion is one recorded decision on `update_item` — six dispositions from
FRD-032, each applying the link, archive or profile change it implies inside the
same atomic write under the board write lock. Captures stay visible and
searchable (the observation *is* the body, which `searchItems` already covers)
but leave the readiness surfaces: group progress stops counting them and the
standup drops them from Flags and Up next. Every new frontmatter field is
optional and additive, so the installed stable v0.3.12 server parses, preserves
and re-emits them unchanged. **No new MCP tool** — the roster is still 39.

## Changes

| File | Change | Why |
|---|---|---|
| `packages/core/src/profiles.ts` | modified | `capture: {}` in `DEFAULT_PROFILES`; `CAPTURE_PROFILE_ID`; `CAPTURE_DISPOSITIONS` + `isCaptureDisposition`; `isCaptureItem`. One home for the vocabulary so nothing compares profile strings by hand. The "four shipped profiles" comment is corrected — it would otherwise be a lie the next reader trusts. |
| `packages/core/src/board.ts` | modified | `injectCaptureProfile` inside `resolveProfiles`. `board.profiles ?? DEFAULT_PROFILES` is whole-table replacement, so editing the defaults alone would reach new boards only — the live board's `board.yml` declares four profiles and no `capture`. Modelled on `injectFixEnterReview` (ADR-0014) and narrower than it: it adds a profile, not a boundary, so no profile's gated-boundary count changes and ADR-0011's limit is untouched. |
| `packages/core/src/types.ts` | modified | Six optional `capture_*` frontmatter fields; the matching create/update inputs; `profile?` on `ItemFilter`. |
| `packages/core/src/frontmatter.ts` | modified | The six keys in `KEY_ORDER`, so they serialise in canonical position instead of the unknown-key tail. |
| `packages/core/src/store.ts` | modified | `createItem` refuses a blank title or body on a capture and stamps `capture_actor`; `updateItem` refuses emptying a capture and hosts `captureDecisionEffects`; `assertDocGate` refuses `CAPTURE_NOT_PROMOTED`; `takeTicket` refuses the take; `matchesFilter` honours `filter.profile`; `capture_evidence: []` clears like `refs`/`commits`/`prs`. |
| `packages/core/src/group-members.ts`, `groups.ts` | modified | `deriveMembers` still *lists* captures but stops *counting* them in `total`/`complete`. Group progress is a readiness metric, and a capture that never reaches Done would hold a group permanently below 100%. |
| `packages/mcp-server/src/index.ts` | modified | `create_item` gains `capture_evidence`/`capture_actor`; `update_item` gains `capture_evidence`/`capture_disposition`/`capture_result`; `list_items` and `search_items` gain `profile`; `summarise` emits `capture` and `capture_disposition`; tool and profile descriptions state the contract. The MCP boundary is an explicit key list, so a core field is invisible on the wire until added here. |
| `packages/mcp-server/src/execution-packet.ts` | modified | Capture refusal beside the `spike` one. Without it `missingRequirements` reports nothing missing and hands a worker a "ready" packet for an unpromoted observation. |
| `packages/mcp-server/src/smoke.mjs` | modified | The summary-field assertion enumerates the exact key set, so `capture`/`capture_disposition` had to be added; plus the capture round trip over the real MCP wire (create → search → refuse move/take/packet → promote). |
| `apps/gui/.../lib/standup.ts` | modified | A `deliverable` set beside `active`: captures stay countable and blockable but leave Flags and Up next. |
| `apps/gui/.../Editor.tsx`, `TicketCreate.tsx` | modified | `capture` in `PROFILE_IDS`. This is what makes acceptance 1 true for a GUI user, and without it a capture's profile select renders a value it does not contain. |
| `packages/core/src/capture.test.ts` | added | 36 tests, one group per acceptance criterion plus the edge cases. A new file deliberately: CORE-128 concurrently owns `io.test.ts`, `docs.test.ts`, `migrate.test.ts` and `store.test.ts`, none of which were touched. |
| `apps/gui/.../lib/standup.capture.test.ts` | added | 4 tests for the standup exclusion, in the GUI suite where `standup.ts` lives. |
| `packages/core/src/board.test.ts` | modified | Its "ships the four profiles" assertion enumerates the exact shipped set and had to gain `capture`. Not one of CORE-128's files. |
| `plugins/kanmer/skills/kanmer-tickets/SKILL.md` | modified | Removed **"Quick-filed tickets default to `docs_todo`"** — the one instruction in the system that would have given a capture document debt — and replaced it with the capture route plus the promotion table. |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | modified | New fields and summary keys; pinned against live tool names by `check-plugin-sync.mjs`. |
| `plugins/kanmer/skills/kanmer-auto/SKILL.md` | modified | The roster drops captures beside archived and blocked, and reports them as exclusions. The prose now *describes* an enforced rule rather than being the enforcement. |
| `plugins/kanmer/skills/kanmer-report/SKILL.md`, `kanmer-groom/SKILL.md` | modified | Captures out of Up next and every Flags category; groom gains an "undecided captures" item that offers the six dispositions and never promotes on its own. |
| `docs/manual/profiles.md`, `apps/gui/.../manual/chapters.generated.ts` | modified / generated | The shipped-profile table, a quick-capture section, and the fact that `capture` is not usable as an area/board default. Generated file rebuilt with `npm run build:manual`. |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | modified (committed build artifact) | Core compiles into the bundle, so `npm run plugin:build` is mandatory even for core-only changes (AGENTS.md §8 gotcha 8). |

## Governing docs

**`docs/functional/frd/FRD-032-quick-capture-and-promotion.md` — meets it; nothing modified, no new ADR.**

- **AC1 — create and search a capture with only the required observation fields and no delivery-document debt.** `create_item(profile: "capture", title, body)`; nothing else is accepted as sufficient and nothing else is demanded. `docs_todo` is never defaulted (`store.ts` writes it only when passed `true`) and the `capture` profile declares no `governing-doc`, so the probe is never consulted. Searchable through the existing full-text search because the observation is the body. Proven by `capture.test.ts` § "acceptance 1" and by the smoke's wire round trip.
- **AC2 — a goal roster and readiness view exclude unpromoted captures.** Mechanically: `assertDocGate`, `takeTicket` and `get_execution_packet` refuse; `deriveMembers` stops counting; `standup.ts` drops them from Flags and Up next. Then described in `kanmer-auto`, `kanmer-report` and `kanmer-groom`. The readiness *view* needs no special case at all — an empty profile produces an empty gate report, and the GUI panel already has a zero-requirement branch.
- **AC3 — each promotion outcome records its chosen disposition and resulting link or ticket.** The six dispositions with `capture_result`, `capture_decided_at` and `capture_decided_by`, validated before anything is written and applied as one atomic patch. `duplicate` links and archives; `already-fixed` and `not-required` archive; `batch` records the batch id; `promoted` records the new profile; `retained` is the only decision that may be superseded, because "keep it as a capture" must not be a trap.
- **AC4 — promoting to a normal ticket applies its profile and normal gates only from that decision onward.** `promoted`/`batch` require the same patch to name a non-capture profile; gates re-evaluate on the next read and nothing is applied backwards. Tested both ways: promoting to `feature` immediately owes a governing doc, promoting to `fix` owes nothing in Backlog and moves straight on.
- **Edge cases.** Absent and empty `capture_evidence` are both valid; a blank title or observation is refused at create *and* at update. A capture can never be taken, so `taken_at` is never written and no lease or claim classifier can ever see it — which is what actually delivers "may sit in Backlog indefinitely without appearing as an expired plan or claim".

**PRD-002 requirement 5** is met through FRD-032. **ADR-0011 / ADR-0014** are respected, not modified: ADR-0014 was required because `injectFixEnterReview` *added a gated boundary* and changed `collapsesPipeline`'s count; `capture: {}` declares no boundaries, so the one operation ADR-0011 guards against is the one this does not do. `capture.test.ts` pins that by asserting `resolveProfiles` of an injected board deep-equals one that declares `capture: {}` itself — i.e. the injection has no collateral effect on any other profile.

## Risks / follow-ups

- **v0.3.12 can read a capture but cannot create one.** `assertProfileAgainstBoard` runs only when a write *names* `profile`, so the installed stable server edits a capture's other fields happily and refuses only an explicit `profile: capture`. Frontmatter is `.passthrough()` in both builds (checked against the `v0.3.12` tag, not assumed), so the new keys round-trip; the only visible effect is that a v0.3.12 write re-emits them at the tail of the block. Deliberate, recorded, not worked around.
- **The exclusion predicate is the *explicit* `profile` field.** An area or board `defaultProfile: capture` is unsupported and documented as such in the manual. `assertDocGate` additionally honours the resolved id, so the delivery bar is the stricter of the two — an area-defaulted capture is still refused delivery, it just would not be excluded from group counts. Setting a whole area's default to `capture` is nonsensical rather than dangerous.
- **`packages/core/src/staleness.ts` and both reconciliation modules were measured and left alone.** `staleness.ts` is repo-*artefact* staleness and never reads a ticket; `reconcileEvidence` already returns `NO_RECONCILIATION_NEEDED` for a claimless Backlog ticket. The ticket's own design guidance pointed at `staleness.ts`; measuring it showed the guidance was wrong, and adding capture handling in either place would have been dead code.
- **Follow-up, parked in `open-questions/`:** a first-class GUI capture affordance — a composer that asks only for title and observation, an evidence attach control, and a "hide captures" toggle in `FilterBar.tsx`. The two `PROFILE_IDS` lines already make a capture creatable and editable in the GUI, which is what AC1 needs. Recommend filing it as a GUI ticket in HZN-008 rather than widening this one. Also parked: bulk promotion of several captures in one decision — `capture_result` already records the batch per capture, so it needs no format change later.
- **`profile-matrix.test.ts` was not regenerated**, contrary to the plan's expectation: it iterates a hardcoded `["feature","fix","chore","spike"]`, not `DEFAULT_PROFILES`, so its snapshot is genuinely unaffected. Left as-is — the matrix is deliberately about the four delivery profiles, and the injection's non-perturbation is pinned more directly in `capture.test.ts`.

## Verification hand-off

Run on the merged SHA, from the merged checkout:

| Command | Expected |
|---|---|
| `npm run test -w @kanmer/core` | 501+ pass. `claims.test.ts` may fail with `Test timed out in 5000ms` / `ENOTEMPTY … rmdir` — a recorded host quirk (CORE-128), reproduced identically on unmodified `origin/main`. It passed cleanly in the final full run. |
| `npm run test -w @kanmer/gui` | 524+ pass, including the 4 new `standup.capture.test.ts` cases. |
| `npm run typecheck` | clean across core, mcp-server, ui, gui. |
| `node packages/mcp-server/src/smoke.mjs` | **328/328**, including the eight new capture checks. The tool count assertion must still read 39. |
| `npm run smoke:protocol` / `smoke:discovery` / `smoke:headless` / `mcpb:check` | 50/50, 13/13, pass, pass. |
| `npm run verify:skills` / `verify:agents-block` | ALL CHECKS PASSED; 31/31. |
| `npm run plugin:check` | `39 tools match, bundle bytes match` — this is the one that proves the committed bundle was rebuilt from this diff. |
| `npm run verify:docs` | PASS, generated manual current. |
| `npm run test:http -w @kanmer/mcp-server` | **Known to fail** on this host: `spawnSync … node.exe ETIMEDOUT` in `http.test.mjs`. Reproduced on unmodified `origin/main` before any change here (`BASELINE_EXIT=1`, same assertion). Hosted `verify` is authoritative. |

Local evidence from this run, in the worktree unless noted:

```
npm run test -w @kanmer/core                 → 501/501 pass  (exit 0, final run)
npm run test -w @kanmer/gui                  → 524/524 pass  (exit 0)
npm run typecheck                            → exit 0  (core, mcp-server, ui, gui)
npm run verify:docs                          → exit 0  PASS, 22 chapters current
node packages/mcp-server/src/smoke.mjs       → exit 0  328/328
npm run smoke:headless                       → exit 0
npm run mcpb:check                           → exit 0  3 files, 1713629 bytes
npm run smoke:protocol                       → exit 0  50/50
npm run smoke:discovery                      → exit 0  13/13
npm run verify:skills                        → exit 0  ALL CHECKS PASSED
npm run verify:agents-block                  → exit 0  31/31
npm run plugin:check                         → exit 0  39 tools match, bundle bytes match
npm run test:http -w @kanmer/mcp-server      → exit 1  http.test.mjs spawnSync ETIMEDOUT (host quirk)
  same command, unmodified main checkout     → exit 1  identical assertion — pre-existing
```

`npm run verify` therefore stops at its `npm test` step on this host, for a
reason that predates this branch. Every other step in `scripts/verify.mjs` was
run individually and passed; the hosted rail on the PR is the authority.

No UI screenshots are needed: the GUI change is two profile-picker entries and
one predicate, all covered by unit tests.
