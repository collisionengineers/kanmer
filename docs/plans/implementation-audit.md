# Implementation audit — pre-existing plans vs. the codebase

**Date:** 2026-08-14
**Scope:** every planning doc under `docs/plans/` *except* the `kanmer-v2/` roadmap — i.e. `kanmer-upgrades/` (master + phases 0–8), `pr-1-review/`, and `to-do/`.
**Question answered:** were these plans actually *implemented in the code*, in full? (Not: are they covered by the new v2 feature requests.)

## Method

Four auditors read each plan in full, then **verified every concrete deliverable against the implementing code** (`file:line`), treating the plans' own "✅ done" checkmarks, checklists, and commit messages as claims to be checked — not evidence. Where practical they *ran* the code rather than reading it.

**Basis commit:** `7706a20` ("Phase 8: skills rewritten for v2, kanmer-setup, docs") — the last commit at which the audited plans landed. The working tree additionally carries an **uncommitted** skill restructure (single `kanmer-workflow` → `kanmer-tickets`/`kanmer-research`/`kanmer-plan`/`kanmer-execute` + 6 new skills) and the untracked `docs/plans/kanmer-v2/` roadmap. That WIP touches only skills/docs — the audited core/MCP/GUI code is identical in both states — but it **supersedes the phase-8 plan's text** (see §Phase 8).

### Verification runs (reproduced, not trusted)

| Check | Claimed in plans | Reproduced |
|---|---|---|
| `npm test` at PR-1 merge `50262c1` | 23/23 | **23/23** ✓ |
| `smoke.mjs` at `50262c1` | 25/25 | **25/25** ✓ |
| `plugin:check` at `50262c1` | 11 tools | **11** ✓ |
| `npm test` at HEAD `7706a20` | 53/53 | **53/53** ✓ |
| `smoke.mjs` at HEAD (dev build) | 62/62 | **62/62** ✓ |
| `smoke.mjs` at HEAD (committed plugin bundle) | 62/62 | **62/62** ✓ (rebuild byte-identical — bundle is current, not stale) |
| `plugin:check` at HEAD | 20 tools | **20** ✓ |

## Bottom line

**The pre-existing plans were implemented in full and are test-verified.** All of Phases 1–8, the 9 validated PR-1 findings, and both parts of the to-do plan map to real, confirmed code. The exceptions are a small, specific set of genuine gaps, a few behavior-met-but-mechanism-diverged items, some untested-but-present code, honestly-deferred work, and two documented-but-unfixed hazards — all itemized below.

---

## Per-plan results

### Phase 1 — Core correctness & safety — ✅ fully implemented
All seven items verified in code **and** by the vitest suite: board-validation on write (`store.ts:862-875`, called from create/update; move delegates), area-`""`-legal, board-derived priority default, path-traversal guard (`paths.ts:50-74`, `assertSafeId`), no-op-write skips `updated` bump (`store.ts:530-536`), `link_items` target-must-exist (`links.ts:98-104`), `delete_item` dangling-link cleanup + body-ref report (`store.ts:778-807`), optimistic concurrency `expected_updated` (`store.ts:522-529`), exclusive-create id race (`io.ts:41-58` + retry loop `store.ts:462-505`; 10-way concurrent test passes).

### Phase 2 — Format-v2 storage + migration — ✅ fully implemented
`version.json`/format detection (`version.ts`, `store.ts:116-127`), area `prefix` + PR-Review default (`types.ts:24-27`, `board.ts:15-36`), v2 path helpers (`paths.ts:90-108`), area-folder CRUD with id-immutable folder rename (`store.ts:487-559`), ticket-docs API + append (`store.ts:707-770`), take/release semantics (`store.ts:644-705`), proof gate (`store.ts:828-843`), and the full v1→v2 migration (`migrate.ts`: dry-run, byte-preserved bodies, plan/research fold, orphan→labelled ticket, prefix pinning, counter re-key, idempotent). Exhaustively covered by `store.test.ts:708-757`.

### Phase 3 — MCP surface v2 + 2026-07-28 modernization — ✅ implemented, 3 caveats
All tools present and correct: `get_status`, `take_ticket`, `get/set_ticket_doc`, `create_items` (cap 50), `list_items` upgrades, `update/remove/reorder_column`, SDK `^1.30.0`, `_meta` actor attribution (`index.ts:63-76`), MRTR elicitation (`confirmDestructive` `index.ts:84-102`), resources + `subscriptions/listen` (`index.ts:691-766`), prompts. Caveats:
- **`get_status` diverges from the literal plan** — reworked so reads *never* create `.kanmer/` (`main()` never calls `store.init()`; write tools call `ensureInit()` lazily) rather than reporting a "boot created it" boolean. Goal met, arguably better; the exact field described doesn't exist.
- **Elicitation + resources/subscriptions have no automated test** — `smoke.mjs` never advertises the `elicitation` capability, so `confirmDestructive` always short-circuits to "proceed"; the confirm/decline path is unexercised. Resources/subscribe likewise has no notify assertions.
- **"Run smoke against an older-protocol host"** (a stated Phase 3 verification step) has **no artifact** — nothing pins or simulates a pre-2026-07-28 negotiation. Asserted, not proven.

### Phase 4 — GUI trust — ⚠️ one real gap
Diff-based saves (`Editor.tsx:219-260`), live re-sync + conflict banner (`Editor.tsx:186-204,406-427`), Settings validation (`Settings.tsx:371-401`), external-links-in-browser + HTML-escape (`main/index.ts:148-157`, `markdown.ts:16-17`), empty/error states, QuickAdd-blur-never-creates, full-height drop zones — all implemented.
- **GAP (silent data loss):** the unsaved-edit guard (`trySelect`) is bypassed by `openProject()`, which calls `setSelectedId(null)` directly (`App.tsx:83`). Switching projects via **Ctrl+O / Open Recent / the header project button** discards an open unsaved edit with no prompt — the exact failure Phase 4 targets.

### Phase 5 — Real Windows app — ⚠️ three partials (behavior met)
Icon/AUMID, native toasts w/ self-write suppression + batching, single-instance lock, window-bounds persistence, real app menu (DevTools gated on `!app.isPackaged`), keyboard shortcuts, focus/ARIA + keyboard card-move, Delete=Archive — all implemented.
- **5.8 PARTIAL:** live "system" theme follow is done in the renderer via `matchMedia` (`App.tsx:129-137`), not via main's `nativeTheme.on("updated")` as planned. Behavior met, mechanism differs.
- **5.9 PARTIAL:** native context menu is wired to board cards only (`Board.tsx:192-195`); the plan's `ItemList.tsx` doesn't exist and `ArchivedList.tsx` has no context-menu integration.
- **5.2 minor:** batch-toast window is 1.8s in code (`main/index.ts:257`), not the documented 5s.

### Phase 6 — Data-model extras — ✅ fully implemented, no gaps
Activity log + `get_activity` + rotation (`activity.ts`), blocks/derived-blocked-by (`links.ts:57-73`), `due`/overdue filters, fractional `order` + `move_item position` (`store.ts:596-635`). Every plan bullet maps to a line and a passing test (53/53).

### Phase 7 — GUI evolution — ⚠️ one real gap
All nine numbered items (7.1–7.9) implemented to the letter, including exact parameters (migration banner, doc tabs, Standup view, activity feed/toasts, scoped refresh, `memo(Card)`, optimistic drag, resizable editor, chip inputs, Ctrl+K palette).
- **GAP (missing badges):** the phase Goal ("taken/blocked/due badges") and the 6.2/6.3 cross-refs ("Card badge in Phase 7", "Overdue card badge in Phase 7") promised `blocked` and `due`/overdue card badges; only the **`taken`** badge (⛏) shipped on `Board.tsx`. `blocked`/`overdue` have zero presence in `Board.tsx`/`styles.css` despite the data being fully wired. (The `due` half is now moot — kanmer-v2 removes `due` — but the **`blocked` badge gap stands**.)

### Phase 8 — Skills, plugin, docs — ✅ landed at HEAD, then superseded on disk
Implemented almost verbatim in commit `7706a20` (single `kanmer-workflow`, `kanmer-onboard→kanmer-setup`, 5 templates, `kanmer-standup` rewrite, AGENTS.md/README refresh, release rail). **The working tree then superseded it:**

| Phase-8 plan said | On disk now (uncommitted) |
|---|---|
| `kanmer-workflow` (1 skill) | `kanmer-tickets` + `kanmer-research` + `kanmer-plan` + `kanmer-execute` (4) |
| — | +`kanmer-review`, `kanmer-closeout`, `kanmer-auto`, `kanmer-retro`, `kanmer-groom`, `kanmer-import` (6 new) |
| `kanmer-onboard` → `kanmer-setup` | as planned |
| `kanmer-standup` rewrite | as planned |
| 5 templates in one `assets/` | relocated across 3 skills + a new `pr-template.md` |
| `tool-reference.md` under `kanmer-workflow` | relocated to `kanmer-tickets/references/`; `check-plugin-sync.mjs` updated, passes (20 tools) |

Content-wise nothing was lost. But **the phase-8 plan and the master `upgrades-plan.md` index are now stale** (they still describe the single-`kanmer-workflow` model).

### PR-1 review (`pr-1-comments.md`) — ✅ 9/9 fixes in code, 1 correctly refuted
All nine validated findings verified against the code (codex plugin-root `.mcp.json`; position/role-based standup buckets; board-validation in `store.ts`; `include_archived` freshness; board-column verbs added; no-eager-init; accurate `update_item`/`list_items` references + `archived`). The refuted #2 (codex `interface` metadata) is correctly still absent. PR-1 exit numbers reproduced at merge `50262c1` (23/23, 25/25, 11 tools). One note-vs-code drift: the fix function is `assertFieldAgainstBoard`, not the `assertKnownStatus` named in the implementation notes.

### to-do plan (`120826-…`) — ✅ Part A + B done; 4 out-of-scope items still open (as intended)
Part A (`phase` fully removed — zero references in schemas/GUI; legacy passthrough tested) and Part B (both manifests, both marketplaces, sync script, three skills) implemented. The four **"Out of scope"** items remain unimplemented, correctly and with no partial work: npm-published server (`package.json "private": true`, no `.github/`), marketplace directory submissions, GUI agent-presence indicator, auto-migration of old status ids (`migrate.ts` never touches `status`).

### Master locked decisions (`upgrades-plan.md`) — ✅ all landed except cacheable lists
Format-v2, 5-doc pipeline + proof gate, Delete=Archive, unfocused batched toasts, `kanmer-setup`, MCP modernization — all in code. **Cacheable `tools/list` (`ttlMs`/`cacheScope`) is the sole partial** — blocked on SDK 1.30 not exposing the 2026-07-28 fields, honestly flagged in `index.ts:832` and AGENTS.md §11.

---

## Consolidated findings

### A. Genuine gaps (planned, not/partially delivered)
1. **Silent data loss on project switch** — `openProject()` bypasses the `trySelect` unsaved-edit guard (`App.tsx:75-91,83`). Switching projects mid-edit discards changes with no prompt. *Real bug.*
2. **Missing `blocked` card badge** — promised in Phase 7's Goal + 6.2 cross-ref; only the `taken` badge shipped (`Board.tsx`). Data wired, never surfaced. *Real, minor.*
3. **GUI whole-board `setBoard` can strand items on column removal** — the IPC write (`main/index.ts:407-410`) lacks the occupied-column protection `removeColumn` has (`store.ts:219-249`). Documented in AGENTS.md §11, never fixed. *Real hazard.*

### B. Test-coverage gaps (code present, unverified)
4. **MRTR elicitation + resources/subscriptions** — no automated coverage; the confirm/decline branch is never exercised (`smoke.mjs` never advertises `elicitation`).
5. **Older-protocol back-compat smoke** — the Phase 3 verification step has no artifact.
6. **AGENTS.md managed block** — `kanmer-setup` writing it is skill *prose* only; nothing verifies an agent actually does it.

### C. Behavior met, mechanism diverged (doc drift, not misses)
7. `get_status` (never-init vs. boot-boolean) · 8. Phase 5.8 (`matchMedia` vs. `nativeTheme.on`) · 9. Phase 5.9 (cards-only context menu) · 10. Phase 5.2 (1.8s vs. 5s toast) · 11. `assertFieldAgainstBoard` vs. the `assertKnownStatus` name in PR-1 notes.

### D. Honestly deferred / out-of-scope (correctly absent, not silently dropped)
12. Cacheable `tools/list` (SDK-blocked) · 13. MCP Apps (exploratory) · 14. codex `interface` metadata `longDescription`/`capabilities`/`defaultPrompt` (P3, pre-publish) · 15. npm-published server · 16. marketplace directory submissions · 17. GUI agent-presence indicator · 18. auto-migration of old status ids.

### E. Live documented hazards (unfixed, accurately documented in AGENTS.md §11)
19. GUI `setBoard` column-stranding (= A3). · 20. TICK-fallback prefix double-allocation race (narrow; only when a v2 board's `areas` list is emptied). Accepted edge.

### F. Documentation staleness
21. `kanmer-upgrades/phase-8-skills-plugin-docs/plan.md` and the master `upgrades-plan.md` index describe the single-`kanmer-workflow` model; the disk has the 12-skill split. (Captured as the baseline in `kanmer-v2/phase-0-baseline/`.)

---

## Relation to the kanmer-v2 roadmap

*(2026-08-14 review: all four promotions below were accepted into v2 scope — see `kanmer-v2/phase-0-baseline/` loose ends for the tracked set.)*

- **A1** (switch-discards-edits) — **promoted to v2 Phase 3** (`openProject` routed through the dirty guard; not left waiting for Phase 5's tab guard, which then generalizes it). It's a live single-project bug today.
- **A3 / E19** (setBoard stranding) — **promoted to a real fix in v2 Phase 4** (the Settings save path gains `removeColumn`'s occupied-column protection).
- **A2** (`blocked` badge) — **folded into v2 Phase 3** alongside the new deployment/PR card badges.
- **B4/B5** (elicitation/resources coverage) — **folded into v2 Phase 2's smoke rewrite**; the older-protocol back-compat check remains open, tracked in v2 Phase 0.
- **F21** (stale index) — corrected in place: `upgrades-plan.md` now carries a supersession note pointing at the 12-skill split + the v2 Phase 0 baseline.

Items **D** and **E20** are intentional scope decisions, not defects — no action implied.
