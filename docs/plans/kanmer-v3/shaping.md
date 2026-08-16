> **HISTORICAL RECORD — not operational.** This is the verbatim decision trail of the shaping session, including project-specific evidence from the boards that motivated the design. Nothing here is an instruction to visit or act on any repository; the operational documents are `docs/` and `plans/`.

# Kanmer v3 shaping — provisional decisions record

**Date:** 2026-08-15 · **Status:** COMPLETE. All rounds settled (1–8 incl. corrections). Full artifact set produced: vision + PRD-001 + ADR-0001…0010 + FRD-001…024 (incl. backfill 015–023) + phase plans 0–6 + the pegasus event. The one forgotten thought ("when we are implementing, …") reopens this record if recalled.

---

## 1. Why this session exists

1. "Area" alone is not enough linkage → groups (settled).
2. Interrogative workflow distilled into skills, as prose, no protocol import (settled).
3. Doc conflation (impact vs research) (settled: rename + templates) — **now extended by the R5 pivot: pipeline weight must scale with ticket size** (profiles), because forcing a full pipeline on trivial tickets teaches agents to write junk docs.
4. Governance on Kanmer itself (settled).
5. codex MCP pileup (settled).
6. Board-scale UX (settled).

## 2. Threads in scope

| Thread | Subject | State |
|---|---|---|
| A | Groups | Settled (D10/D15/D17/D18/D23/D26) |
| B | Interrogative workflow | Settled (D3/D4) |
| C | Doc pipeline clarity | Settled renames/templates (D6/D8); **doc model reshaped by R5 profiles+folders — details O1–O3** |
| E | Fixed 6 stages; priority removed | Settled (D19/D20/D24/D25) |
| F | codex project-scoped registration | Settled (D12) |
| G | Backlog list view | Settled (D22/D27) |
| H | Sequencing | Open by design; after O1–O4 |

## 3. Facts established

- **F1** — Areas: folder + immutable id prefix; grouping layers on top.
- **F2** — codex writes global config via `mcp add`; project-scoped `.codex/config.toml` exists (trusted only); Claude already project-scoped; config-file provider pattern exists.
- **F3** — impact-template fine; the *name* + back-to-back writing cause conflation.
- **F4** — Pegasus: labels fake epics/horizons/state; 4 custom stages → inert gates; 194-card To Do.
- **F5** — Git tab = Phase 9 board worktree + branch-scoped auto-sync.
- **F6** — "Auto button" = format-migration prompt (dry-run, blockers, one press); shipped for v1→v2; vehicle for format 3.
- **F7** — Doc types already per-board config (v2 `board.docs`).
- **F8** — Dispatch today is whole-ticket; reshaped by D11.
- **F9** — Ticket folders already tolerate extra files (`scratch-*.md`, `assets/`) — precedent for folders/multi-doc.

## 4. Decision log (settled)

| # | Decision |
|---|---|
| **D1** | `area` keeps structural role + name. |
| **D2** | One grouping concept, kind-extensible; cohesion-motivated. |
| **D3** | Questioning in setup (deepest), research, plan; lighter at intake. |
| **D4** | Genuine uncertainty on user-owned decisions is never silently resolved; depth ∝ stakes. |
| **D5** | Dispatch = single granular deliverable. |
| **D6** | `impact` → **`files`** doc type: "Files to change" (path+why+risk) + "Context files"; header contrast rule. *(Now lives as a folder per D-pending O2.)* |
| **D7** | No requirements doc, no new concept. |
| **D8** | Doc-type decision table in kanmer-docs + first-line identity header in every template. |
| **D9** | Label→group migration in kanmer-groom; pegasus: INT-*→epic, now/next/post-alpha→horizon, blocked label→blocks edges. |
| **D10** | Groups = ticket-folder pattern (`groups/EPIC-001/EPIC-001.md` + shared docs); membership on tickets; members/progress derived. |
| **D11** | Dispatch UI = task picker; headless rule in prompts. |
| **D12** | codex → project `.codex/config.toml` + trust caveat + legacy cleanup. |
| **D14** | Board-scale UX in scope. |
| **D15** | `kind` stays (board-declared; drives display/filter/skills/migration). |
| **D16** | Full PRD/FRD/ADR on Kanmer itself, proportionately. |
| **D17** | Skills direct agents to the right reading surfaces (incl. groups' shared context docs). |
| **D18** | Group MCP tools mirror ticket docs (D26). |
| **D19** | **Stages fixed at 6:** Backlog → Preparing → Implementing → Review → Verifying → Done. Non-customizable. |
| **D20** | No generalized stage-migration UI; pegasus brought in line once. |
| **D21** | De-customization: stage editing leaves GUI+MCP; doc-type vocabulary + deployment envs stay configurable. **Amended (R5/R6):** per-area doc sets (shipped in v2 — the GUI Documents tab's per-area dropdown) are **replaced by profiles**; an area may still set a *default profile* (and default proof type) — e.g. UI area defaults to a visual-proof profile. |
| **D22** | Backlog = dedicated list view; kanban shows Preparing→Done. |
| **D23** | Group GUI v1: chips + filter dropdown + detail view; swimlanes deferred. |
| **D24** | **Format 3** via existing migration prompt; hardcoded status alias map; unmappable → Backlog + `needs-restage`; migration code stays (old clones must open); expected last board-shape migration. **R5 adds folder restructure + priority removal to the same format-3 migration.** |
| **D25** | **Priority removed entirely** (passthrough-preserved on old files; horizon groups + manual order replace it). |
| **D26** | Group tools: `create_group`, `get_group` (derived members+progress), `list_groups`, `get/set_group_doc`; membership via `update_item`; delete=archive; per-kind id prefixes (`EPIC-001`, `HZN-001`). |
| **D27** | Backlog list shares search/area/group/label filters with board; sort is list-only. |
| **D28** | **Docs are unlimited** for tickets and groups. *(Mechanism superseded in R5: folders, not typed filenames — O2.)* |
| **D29** | **Direction accepted (R5): requirement profiles.** Pipeline requirements are per-ticket via named profiles with board-level definitions and a custom escape hatch; profiles map stage boundaries → required docs (`StageName: Req1, Req2`). Rationale: requirement weight must scale with task size (e.g. "remove a redundant link" ≠ full pipeline). Details O1. |
| **D30** | **Folder-per-doc-type, full uniformity (settled R6):** `TICK-001/TICK-001.md` + `research/`, `files/`, `plan/`, `checklist/`, `post-implementation-report/`, `proof/`, `scratch/`, `assets/`. Containment defines type; a gate is satisfied by ≥1 `.md` in the required type's folder; custom profiles may name specific files (`research/auth`). Folders created **on first write**, never at ticket creation. Restructure rides the format-3 migration (D24). |
| **D31** | **Typed proof with soft validation (settled R6):** proof types declared in board.yml (`visual`, `test-output`, `command-log`, …), each with a template + skill guidance; profiles/custom reference `proof:visual`. Enforcement = guidance + a visible gate *warning* on mismatch (e.g. `proof:visual` with zero images in `proof/`) — never a hard block (hard checks get gamed; warnings keep the human judging). Hard gate remains "≥1 proof doc exists". |
| **D32** | **Proof ≠ deployment (clarified R6):** proof evidence is gathered on the **local build of merged `main`** by default; `deployment` stays a separate, non-gating tracker recorded at closeout. Deployed evidence is opt-in, never default — trivial tickets never wait on release cycles. |
| **D33** | **Profiles named by nature of work, not size:** shipped set **feature / fix / chore / spike / custom**. feature: leave-Backlog [governing-doc], leave-Preparing [research, files, plan, checklist], enter-Review [post-implementation-report], enter-Done [proof]. fix: leave-Preparing [files, plan], enter-Done [proof]. chore: leave-Preparing [plan], enter-Done [proof]. spike: enter-Done [research] — the research IS the deliverable; Implementing/Review/Verifying never apply. custom: inline `requires:` map on the ticket. Board default = **fix**; areas may override the default (e.g. UI → feature + proof:visual). Rationale: agents infer work-type from ticket content far better than they judge size, and feat/fix/chore is vocabulary they already know. |
| **D34** | **Proof type and proof source are separate axes:** `proof:visual` (source defaults to local merged-main build); `proof:visual@<env-id>` opts into deployed evidence, valid only for board-declared deployment environments. Soft-validation warnings (D31) extend to source mismatches. |
| **D35** | **Skills are not the contract (R7; premise CORRECTED R8).** All five hosts now load skills (verified: opencode native incl. `.claude/skills`/`.agents/skills`; Antigravity project `.agents/skills/`). The hierarchy survives on what's still true everywhere: skills are on-demand, permission-gated, install-time copies, and skippable prose — so gates > tool descriptions > AGENTS block > skills. Within-skill support files ship fine; cross-skill references allowed only because the roster installs atomically (stated constraint). Connect bonus: one `.agents/skills/` write serves opencode + Antigravity; AGENTS block demotes to universal orientation layer. Provider facts re-verified at implementation time. → ADR-0009 (rewritten). |
| **D36** | **Skills must derive rules, never restate them (R7 hardening).** Skills call `get_doc_gates` (profile-aware) instead of hardcoding gate prose — kanmer-auto is the worst current offender and its Wave 0 must partition by profile (spikes finish at research; chores skip it). |
| **D37** | **kanmer-import is removed; setup absorbs it and grows (R7):** (i) GitHub issues → tickets, then issues **closed on GitHub with a "migrated to Kanmer (TICK-xxx)" note** — destructive external action, so list-then-confirm, never silent; GitHub stops being a source of truth. (ii) **Historical backfill:** existing plan/markdown docs → **done tickets** (plan doc into `plan/`, its verification content seeds `proof/`; profile `custom` with empty requires so gates never nag retroactively; creation-into-Done already ungated). Kanmer's own `docs/plans/` phases are the dogfooding case. (iii) No plan docs → mine commit history. Open: post-setup issue sync (Q39), granularity (Q40). |
| **D38** | **Research redefined (R7):** the shipped skill is codebase-centric — too narrow. Research = building whatever relevant material makes the plan good: codebase, vendor doc MCPs (Microsoft Learn, Azure, …), web searches, experiments — findings recorded with sources. Folder model already fits (`research/<topic>.md` per source/area). |
| **D39** | **Prepare merge REJECTED (R7):** research and plan stay separate skills. User's law — *stage boundary ≠ task boundary; research and planning are different tasks* — wins, and D11 (dispatch targets single deliverables like "just research") structurally requires targetable task skills. Roster = **12** (13 − import). Assistant's merge recommendation withdrawn; the "one skill per transition" law is restated correctly as **one skill per task type**. kanmer-auto/dispatch overlap named in both. No new group skill: CRUD → kanmer-tickets, context-reading → research/plan/execute prose, migration → groom. |
| **D40** | **Setup = reconciliation (R7, corrects assistant overengineering in Q39):** no sync mode. Whenever setup runs, it ingests whatever exists that isn't Kanmer — GitHub issues (→ tickets, then closed on GitHub with a migration note, list-then-confirm), stray plan/markdown docs, and it applies any Kanmer-version post-update steps. Idempotent, re-runnable, one verb: reconcile. |
| **D41** | **Backfill is per-item (R7, user overrides coarse recommendation):** each plan item → a done ticket; mined items seed board structure (areas etc.) — "what was done is the template for what is coming." Commit-history mining is the no-docs fallback. Historical tickets: profile custom, empty requires. |
| **D42** | **Research deepened (R7):** quick/deep axis; deep mode emulates deep-research products — plan research questions, fan out across source classes (pure/web + vendor MCPs incl. Microsoft Learn & Azure; codebase understanding; **live estate** — deployment state, logs — via connected MCPs **or read-only CLIs (az, kubectl, gh, …)**; reference files), then synthesize a summary doc with sources for planning's entry point. **Research subfolders** allowed (`research/azure/…`); containment recursive; doc tools take nested paths; gates count any `.md` under the type folder. |
| **D43** | **Reference files (R7):** ticket folder gains `reference/` for human-provided, non-generated inputs (example files, UI mockups, bug screenshots, API schemas — non-exhaustive). GUI: add/upload onto a ticket. Agents: read access + must consult. Terminology kept strictly apart from frontmatter `refs` (governing repo docs): "reference files" vs "governing docs" everywhere. |
| **D44** | **Read-everything rule (R7):** any task on a ticket begins by examining the whole ticket folder — body, all docs, reference files, and its groups' shared context. Enforced across all contract layers (D35): skill prose + tool descriptions + AGENTS.md block. |
| **D46** | **In-app manual (R9, user request):** Help menu gains a real manual — offline, searchable, chaptered, theme-consistent, content generated from the FRDs (shortcuts chapter generated from the actual binding table so it can never drift). → FRD-024, Phase 5.5. |
| **D47** | **Themed context menus (R9, user request):** all right-click menus become renderer-drawn, theme-variable components (the native OS menu cannot be themed and looks disjointed); full keyboard/a11y; card menu gains "Add to group ▸". → FRD-019 R6, Phase 4.8. |
| **D48** | **Durable-docs principle confirmed (R9):** FRDs are end-state specs of the whole product absorbing shipped behaviour; completed features get backfilled FRDs (015–023) verified against code in Phase 0 — the documentation mirror of D41's ticket backfill. "We may develop a feature later that requires pre-existing accurate documentation." |
| **D45** | **Living documents (R7):** `files/` is written before planning but updated whenever planning or implementation discovers new touched files; the same maintenance duty applies to other docs as later stages learn. |

## 5. Corrected understandings

- Q15: over-formalized questioning → natural prose per skill.
- Q10: `kind` needed a job description before acceptance.
- Q13: "initiative" defined; Kanmer's governance never constrains target repos.
- Q24: no migration machinery for a population of one.
- **Q32: assistant's typed-filename scheme rejected in favor of the user's profiles + folders proposal** — structurally cleaner and solves the right-sizing problem the assistant's scheme ignored.
- **R8b: assistant's FRD batching violated its own "one feature per FRD" definition** — user caught it ("isn't an FRD meant to be specific to a feature?"). Corrected to 14 single-feature FRDs; living-docs and read-everything reclassified as cross-cutting requirements, not FRDs. Direct evidence for D8's decision table, which gains the acceptance-criteria test: one crisp list, one "done", else split.
- **R8: the "opencode/antigravity have no skills" claim was WRONG** — the assistant repeated Phase-6-era provider research as current host capability; both hosts have full project-scoped skill support (user caught it; web-verified). ADR-0009 rewritten on corrected grounds; provider install specs get re-verified at implementation time.

## 6. Open questions

**None.** Round 7 closed: prepare merge rejected (D39), setup=reconciliation (D40), per-item backfill (D41), research deepened (D42), reference files (D43), read-everything (D44), living docs (D45). Q36 remains closed-as-forgotten (reopens on recall).

## 7. Parked / out of scope

Sequencing (after O1–O4) · previously suggested roadmap items · sprint semantics.

## 8. Next steps

Frontier empty → user confirms shared understanding + sequencing (§10) → write the governance docs (§9) → phase plans in house style → implement.

## 9. Decomposition (per D16 — this initiative's governance docs)

**PRD-001 — Kanmer v3: right-sized workflow, groups, and a standardized board.** Problem: pipeline weight doesn't scale with task size (junk docs on trivial tickets); no cross-cutting grouping (labels doing triple duty); board variance makes gates silently inert; agents conflate doc types; codex registration pollutes global config; 194-card columns. Success: profiles adopted on pegasus with zero junk-doc pressure; labels migrated to groups; every gate live on every board; one codex entry per project.

| FRD | Covers | Decisions |
|---|---|---|
| FRD-001 Groups | entity, kinds, folders + shared docs, tools, GUI (chips/filter/detail), label→group migration | D2, D9, D10, D15, D17, D18, D23, D26 |
| FRD-002 Requirement profiles & doc model | profiles, folder-per-type, typed proof + sources, unlimited docs | D28–D34, D6 |
| FRD-003 Standardized board | fixed 6 stages, priority removal, format 3 migration | D19, D20, D21, D24, D25 |
| FRD-004 Interrogative workflow & dispatch | questioning prose in skills, task-picker dispatch | D3, D4, D5, D11 |
| FRD-005 Doc clarity & guidance | files rename/contrast, template identity headers, kanmer-docs decision table | D6, D8 |
| FRD-006 Backlog list view | dedicated table view, shared filters, horizon filter | D14, D22, D27 |
| FRD-007 codex registration | project-scoped config file + legacy cleanup | D12 |

**ADRs (final set of 10):** 0001 membership-on-ticket · 0002 fixed stages · 0003 profiles replace per-area doc sets · 0004 folder containment defines doc type (recursive; incl. reference/) · 0005 proof/deployment separation + source axis · 0006 priority removed · 0007 codex via project config file · 0008 one format-3 migration · **0009 skills are not the contract (gates > tool descriptions > AGENTS block > skills; derive-don't-restate)** · **0010 setup is reconciliation (ingest non-Kanmer reality every run; per-item backfill; close migrated issues)**.

## 10. Proposed sequencing (the deferred Q8 — awaiting sign-off)

| Phase | Content | Size | Depends |
|---|---|---|---|
| 0 | Write PRD-001, FRDs, ADRs into Kanmer's own `/docs/` (dogfood D16; the ADRs get written while the reasoning is fresh) | S | — |
| 1 | codex registration fix (FRD-007) — independent, immediate pain relief | S | — |
| 2 | **Core format 3 (keystone):** fixed stages, profiles engine, folder layout, proof types/sources, priority removal, the single migration | L | 0 |
| 3 | Groups in core + full MCP delta (group tools; profile/gate surfacing; descriptions) | M–L | 2 |
| 4 | GUI: board on the new model — migration prompt, fixed columns, profile picker in add-ticket/editor, gate warnings, priority removal | M | 2 |
| 5 | GUI: groups (chips/filter/detail) + Backlog list view + dispatch task picker | L | 3, 4 |
| 6 | Skills & templates sweep (all 13 skills: profiles, folders, six stages, group reading surfaces, questioning prose; identity headers; kanmer-docs table; groom label→group op) — last, per the house convention that skills freeze only after tool signatures stabilize | M–L | 3 |
| — | **Pegasus brought in line:** run the format-3 migration + groom label→group conversion once Phases 4+6 ship | (event) | 4, 6 |

