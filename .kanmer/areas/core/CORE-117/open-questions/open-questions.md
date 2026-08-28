# Open questions — CORE-117

- [x] **Is a capture a new entity, a boolean flag, or a profile?** — HZN-008's
      non-goals forbid new entities and a global backlog, and ADR-0002 freezes
      the six stages, so only a flag or a profile is available. **Answer: a
      profile, `profile: capture`, with an empty requirement map.** A boolean
      would be a second source of truth that can disagree with the profile, and
      it would still need a profile that owes nothing. The profile gives
      gate-exemption by construction (`gates.ts:134-147`), makes acceptance 4
      ("applies its selected profile … only from that decision onward") a
      one-field change, and reads as zero-requirement on the installed v0.3.12
      server rather than erroring.
- [x] **Where is the observation stored — the ticket body or a frontmatter
      field?** — Frontmatter would make validation and GUI listing trivial but
      puts prose in YAML, is invisible to the stable GUI's ticket detail, and
      would need `searchItems` widened. **Answer: the body**, required non-empty
      for a capture. `store.ts:1959-1975` already searches the body, so
      acceptance 1's "create and search" is satisfied with no search change, and
      the observation is visible in the live v0.3.12 GUI immediately. "Missing
      title or observation is refused" becomes "blank title or blank body is
      refused on a capture", enforced at create and at update.
- [x] **How is optional evidence stored?** — **Answer: `capture_evidence:
      string[]`** of URLs or repo-relative paths, additive optional frontmatter.
      Empty is valid (FRD-032 edge case). The existing gate-exempt `reference/`
      folder was considered and rejected for the required path: it has no MCP
      writer, so an agent could not attach evidence at all. `reference/` remains
      available for a human dropping a screenshot in the GUI.
- [x] **Is promotion a new MCP tool or an extension of `update_item`?** —
      **Answer: `update_item`.** A new tool moves the roster 39→40 and forces
      coupled edits in `smoke.mjs:69`, `smoke-protocol.mjs:160`, `AGENTS.md:413`,
      `docs/manual/connect.md:145`, the generated manual chapter and
      `tool-reference.md`, plus a plugin-bundle rebuild — for one verb. CORE-124
      (AGENTS.md §8 gotcha 18) set the house precedent that additive frontmatter
      needs no new tool, and `update_item` already performs derived side effects
      (an `area` change moves the ticket's folder). Promotion is one atomic
      patch carrying `capture_disposition` (+ `capture_result` where the
      disposition names one), validated in core.
- [x] **What are the disposition values and their derived effects?** — Taken
      directly from FRD-032's six outcomes rather than invented: `duplicate`
      (requires `capture_result` naming an existing ticket; links it and
      archives), `already-fixed` (archives), `batch` (requires `capture_result`
      naming the small-fix batch), `promoted` (requires the same patch to name a
      non-`capture` `profile`), `retained` (stays a capture), `not-required`
      (archives). Each stamps `capture_decided_at`/`capture_decided_by`.
      Write-once **except** `retained`, which may be superseded by a later
      decision — otherwise "retained as a capture" would be a trap.
- [x] **Is prose in `kanmer-auto` enough to keep captures out of goal
      selection?** — No. The roster (`kanmer-auto/SKILL.md:49-81`) drops only
      archived, blocked and foreign-claimed tickets, and an installed older skill
      would not have the clause at all. **Answer: enforce it mechanically** —
      `assertMoveAllowed` refuses a capture any stage but `backlog`,
      `takeTicket` refuses a capture, and `get_execution_packet` refuses one the
      way it already refuses a `spike` (`execution-packet.ts:495-497`). The skill
      prose then *describes* an enforced rule, which is the right order.
- [x] **Do captures count toward group progress?** — FRD-032 excludes them from
      readiness metrics, and `deriveMembers` (`group-members.ts:4-10`) counts
      every non-archived member, so a capture would hold a group permanently
      below 100%. **Answer: exclude from `total`/`complete`, but keep listing
      them** so they stay visible, per "remains visible in Backlog".
- [x] **Does this need its own ADR?** — **Answer: no.** ADR-0014 was needed
      because `injectFixEnterReview` *added a gated boundary*, changing
      `collapsesPipeline`'s count — the exact operation ADR-0011's limit exists
      to stop. `capture: {}` declares no boundaries and changes no other
      profile's arithmetic, and FRD-032 is the governing authorisation. The
      injection's narrowness will be pinned by a test rather than asserted.
- [x] **Does `docs_todo` need code to stop attaching to captures?** — **No**:
      nothing defaults it (`store.ts:755` writes it only when passed `true`) and
      a `capture` profile never declares `governing-doc`, so the probe is never
      consulted. **The change needed is prose** —
      `kanmer-tickets/SKILL.md:56` currently says quick-filed tickets default to
      `docs_todo`, which is precisely the debt FRD-032 forbids. A test pins that
      a created capture carries no `docs_todo` and needs no governing doc.
- [x] **Does the scope fit one reviewable PR?** — **Yes**, once
      `staleness.ts` and both reconciliation modules were measured out of scope
      (they need no change) and no new tool is added. What remains is core +
      three MCP schema extensions + two GUI one-liners and one GUI predicate +
      four skill files + manual + tests in a new file. No split ticket is
      required; the one genuinely separable piece is parked below.

## Parked (explicitly deferred)

- [ ] **A first-class GUI capture affordance** — a quick-capture composer that
      asks only for title and observation, an evidence attach control, and a
      "hide captures" toggle in `FilterBar.tsx`. Safe to defer: adding `capture`
      to the two `PROFILE_IDS` lists already lets a GUI user create, edit and see
      a capture, which is what FRD-032 acceptance 1 requires, and the standup
      exclusion already keeps captures out of the GUI's stale/next reporting.
      Reopened by an operator finding the profile picker too indirect for the
      "record it in five seconds" use case PRD-002 requirement 5 describes.
      Recommendation to the controller: file this as a GUI ticket in HZN-008
      rather than widening CORE-117.
- [ ] **Bulk promotion of several captures in one decision** — FRD-032's "added
      to an explicit small-fix batch" outcome invites it, but CORE-124's batch is
      frozen by its first `take_ticket` and each capture's disposition is an
      individual recorded decision. Safe to defer: `capture_result` already
      records the batch id per capture, so the data supports a bulk verb later
      without a format change. Reopened if operators are recording the same batch
      disposition across many captures by hand.
