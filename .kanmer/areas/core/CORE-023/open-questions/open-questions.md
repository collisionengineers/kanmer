# Open questions — CORE-023

## OPERATOR ONLY — answered

- [x] **Q1 (scheduling). Sequence or parallel with [[MCP-012]]? ANSWERED —
      sequence, MCP-012 first.** MCP-012 merged as `efdc9f3` (PR #46) before
      this ticket left Preparing. This work rebases onto it and adds `repo`
      alongside the existing `server` block, rebuilding the bundle once. The
      conflict cost the question was about never materialised.

- [x] **Q2 (release rail). Is a source-derived fingerprint baked into the bundle
      acceptable? ANSWERED — yes, via MCP-012, with the surviving constraint
      "the stamp must be a pure function of the source tree". This plan needs no
      bake at all, which satisfies the constraint by adding no build input.**
      Now that MCP-012 has landed, `classifyBuild()` names which of the four
      shapes is running, so the bundled skills tree is a determined sibling of
      the running script and can be discovered at runtime instead. Deliberately
      chosen over the authorised bake because a baked *skills manifest* would
      make the bundle's bytes depend on every skill prose file, and
      `check-plugin-sync.mjs`'s byte comparison would then demand an MCP rebuild
      on every skill-prose edit — including [[SKILL-013]]'s, in flight now. The
      authorisation is used, not spent: nothing non-deterministic enters the
      bundle, and nothing new enters it at all.

- [x] **Q3 (scope). GUI surface in this ticket, or a follow-up? OPERATOR
      ANSWERED — follow-up. MCP only.** No IPC, no preload, no renderer. The
      GUI stays blind to everything except board format, which it already
      banners. The follow-up ticket is filed at closeout, and carries with it
      the tidy this plan defers: `providers.ts` reading the skill-destination
      and registration-file lists from core rather than core mirroring them.

- [x] **Q4 (the `agentsBlock.ts` live bug). ANSWERED, and reproduced.** During
      the run that produced this ticket, Connect overwrote this repo's
      `AGENTS.md` with the stale v2 block — seven stages, `impact.md`, the
      deleted `-import` skill; see `scratch-live-reproduction`. **[[SKILL-013]]
      owns the fix**, because it owns deciding what the canonical body is.
      CORE-023 keeps detection and cites the reproduction as its motivating
      case. Consequence for this plan, and the reason nothing here hardcodes the
      block text: SKILL-013 is rewriting that body, so the reference is read at
      runtime from the bundled `kanmer-setup/SKILL.md` and follows the rewrite
      with no code change.

## Settled at planning

- [x] **Q5. `state` vocabulary: `behind` | `compensated` | `unstamped` |
      `unknown`**, as research proposed. `upToDate` is true iff **no** row is
      `behind` — `compensated`, `unstamped` and `unknown` are informational and
      must not flip it, or the flag is false on every repo forever.
      `compensated` is what stops the report crying wolf: every board omits
      `questions-resolved` because `resolveProfiles()` injects it at read time.

- [x] **Q6. Hash every bundled file, report per skill folder — and walk the
      bundled tree, never the destination.** Every file (33 today, all small) is
      cheap and catches template and reference drift, which `SKILL.md`-only
      would miss; per-folder reporting keeps the detail to one line. Iterating
      the bundled paths *into* the destination is what makes an extra skill
      structurally incapable of counting as drift — measured need, not
      theoretical: this repo's `.claude/skills` already holds a user's
      `run-kanmer` skill with a 115-file `node_modules` inside it, which this
      rule never reads.

- [x] **Q7. No caching.** Recompute per call, for the same reason
      `store.detectFormat()` re-stats (`store.ts:167-171`): the GUI — or the
      agent running `kanmer-setup` — can change these artefacts underneath a
      long-lived server, and a cached "stale" answer surviving the very fix it
      asked for is worse than the cost it saves. Bounded by Q6's walk rule to
      roughly 35 small reads per destination, all wrapped so a failure yields
      `unknown` rather than breaking the orientation call.

- [x] **Q8. No `reconciledWith` in `version.json` in this ticket.** Nothing
      writes it until `kanmer-setup` does, so it would be permanently absent —
      a row that reports `unknown` on every repo forever and means nothing.
      Content hashing makes it unnecessary for detection. It belongs with its
      writer, under FRD-013; recorded here so the omission is a decision rather
      than an oversight.
