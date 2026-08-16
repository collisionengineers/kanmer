
# Phase 7 — Self-adoption: this repo's board moves to v3

**Goal:** Kanmer's own board — which has been running this roadmap since Phase 0 on v2 — becomes a v3 board: migrated to format 3, pre-board history backfilled, phase labels converted to epic groups, the operating rule made permanent. Dogfooding is **not** this phase; dogfooding started at Phase 0. This phase is the changeover.

**Depends on:** 7.1 needs only the **Phase-4 release**; 7.2–7.4 need Phase 6. **Feeds:** steady state — all future Kanmer work flows through its v3 board.

## Items

### 7.1 Migrate this board — S — **runs early, at the Phase-4 release**
- The moment a release carries the format-3 migration + prompt, Kanmer's own board is the **first real-world migration**: review the dry-run (this board is standard 7-stage v2 — expect a clean 7→6 collapse, zero `needs-restage`, priority strip, profile assignment per FRD-002's note), apply, keep working. This is deliberate mid-roadmap verification with real data — the remaining phases (5, 6) are then worked on a live format-3 board, exercising it daily before anyone else does.

### 7.2 Backfill pre-board history — M *(after 6)*
- kanmer-setup reconcile on this repo: `docs/plans/**` (kanmer-upgrades, kanmer-v2, updater, reviews) mined **per item** into done tickets — plan content into `plan/`, verification sections seeding `proof/`, `custom` empty-requires profiles, areas proposed from the mining; preview counts (N docs → M items → K tickets) confirmed before creation; any open GitHub issues ingested with the confirm-then-close flow. Re-run creates nothing.

### 7.3 Labels → groups — S *(after 6)*
- kanmer-groom's conversion turns the `v3-phase-N` labels from item 0.3 into `epic`-kind groups (one per phase, `context.md` pointing at the plan + FRDs) and seeds `NOW`/`NEXT` horizon groups from what's actually in flight. Preview-first, idempotent.

### 7.4 The operating rule — S
- AGENTS.md + `docs/README.md`: Kanmer work flows through the board — tickets before branches, PRs reference ticket ids, gates are not optional for this repo. Stretch (S): release-notes sections generated from tickets reaching Done since the last tag.

## Release rail
None tool-facing. AGENTS.md operating-rule line; `verify-agents-block` green.

## Verification
- 7.1: the dry-run report matches the applied result; the board is fully workable post-migration (a live ticket moved through a gate the same day); the seven v2 stages collapsed to six with zero restages.
- 7.2: audit N mined docs → M items → K done tickets; spot-check 10 tickets file-for-file against their source plans; second run = no-op; issues closed with linking comments.
- 7.3: every `v3-phase-N` label has a corresponding epic with correct derived progress; the `NOW` filter matches reality.
- End-to-end: one real ticket driven through all six stages by an agent on this board — profile-gated, typed proof, closeout records.
