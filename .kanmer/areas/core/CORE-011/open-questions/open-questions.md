# Open questions — CORE-011

**All three resolved.** Written retrospectively, 2026-08-16: these questions were
posed in the ticket **body** rather than in an `open-questions` document, which is
part of why they were never marked answered. Recorded here in the conventional
place so the record is complete. See [[SKILL-012]].

## What actually shipped — read this first

**Neither proposed remedy was built.**

- **R1** (`done` entered only from `verifying`) — not implemented. `STAGE_IDS`
  imposes no such restriction.
- **R2** (a gating document must predate the transition it gates, via mtime vs
  stage-entry) — not implemented. There is no mtime or timestamp comparison
  anywhere in `gates.ts`.

What shipped instead is a **third** solution the ticket did not propose:
`collapsesPipeline` (`packages/core/src/gates.ts:186-193`) refuses any move that
crosses **more than one gated boundary** in a single call. Its own comment states
the reasoning: *"This refuses the collapse structurally, which needs no
timestamps and so has nothing to be wrong about."*

That reframing is what answers all three questions.

## The questions

- [x] **Does R1 break the `chore` one-jump-to-Implementing acceptance case?**
      → **Moot for R1, and answered for what shipped: no, by construction.**
      `collapsesPipeline` counts *gated boundaries*, not stages, and
      `gatedBoundariesCrossed` further excludes boundaries declared with an empty
      requirement list. `chore`'s Backlog → Implementing crosses two stages but
      only one gated boundary; `spike`'s Backlog → Done crosses one. The comment
      at `gates.ts:178-182` names both cases explicitly as the reason for
      counting boundaries rather than stages.

- [x] **Is mtime trustworthy enough, or should stage-entry times come only from
      the activity log?**
      → **Moot — neither is used.** The structural rule needs no timestamps at
      all, which is precisely why it was preferred.
      **Worth knowing for any future attempt:** items now carry `stageEntered` in
      frontmatter, written on every stage change (`store.ts:672-675`), so the
      evidence that made R2 look unimplementable no longer applies. R2 could be
      built today without mtime or log-scraping.
      → **Operator's decision, 2026-08-16: leave it.** The structural rule
      already stops the observed failure and has nothing to be wrong about; a
      timestamp comparison can misfire on legitimate rework for a case already
      covered. Not filed.

- [x] **Warning or block?**
      → **Block.** `collapsesPipeline` is a hard refusal from `move_item`, not a
      `GateReport.warnings` entry. The soft-warning mechanism exists and was
      deliberately not used here — `gates.ts:88-97` reserves it for judgements a
      machine makes badly, such as whether an image file is really a screenshot.
      Counting boundaries is not one of those.

## Parked (explicitly deferred)

- **The 26 tickets closed the old way.** The ticket body records that 26 v3
  roadmap tickets were closed by writing every document after the fact and firing
  one move. The rule now prevents a repeat; it does not retro-fix them, and no
  backfill was attempted. Reopens only if that history is ever relied on as
  evidence of process rather than of outcome.
