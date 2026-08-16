---
status: approved
covers: shipped roster (backfill) + v3 roster changes & rewrite scope
---

# FRD-023 — Agent skills system

## Overview

One skill per **task type** — an agent picks by "what am I about to do", and stage boundaries are not task boundaries (D39). Skills are choreography, never the contract (ADR-0009): they derive rules from `get_doc_gates` and the tool surface.

## The roster (12, end-state)

| Skill | Task |
|---|---|
| kanmer-tickets | Ticket & group CRUD, profile-picking intake (the router; holds the tool reference) |
| kanmer-docs | Repo `/docs/` governance: PRD/FRD/ADR authoring + the decision table (FRD-014) |
| kanmer-research | Quick & deep research, source-agnostic (FRD-005) |
| kanmer-plan | plan + checklist from research/files; approach questions to the user (FRD-009) |
| kanmer-execute | Worktree/branch, work the checklist, post-implementation-report, PR; maintains files/ (living docs) |
| kanmer-review | Pre-merge: PR vs plan/governing docs; feedback → tickets; owns merge |
| kanmer-verify | Post-merge on main; typed proof (FRD-006) |
| kanmer-closeout | Records then cleanup then release |
| kanmer-auto | Many-ticket orchestration in profile-aware waves and file-disjoint lanes |
| kanmer-report | Standup ("now") / retro ("since") from the activity log |
| kanmer-groom | Propose-then-apply board surgery + the label→group migration (FRD-001 G7) |
| kanmer-setup | Reconciliation (FRD-013) |

*(kanmer-import: removed — FRD-013.)*

## Requirements

- R1. **Derive, don't restate**: no skill contains gate rules; every phase skill's first steps are get_item + get_doc_gates + read-everything (FRD-003 T9).
- R2. kanmer-auto partitions by profile (spikes finish at research; chores skip it), lanes by `files/` overlap, target-point semantics retained, every roster ticket reported in exactly one bucket.
- R3. Questioning prose per FRD-009; auto/dispatch cross-reference (FRD-010 R6); templates per FRD-014 live with their skills; the AGENTS block carries the orientation essentials.
- R4. Install matrix per FRD-012; cross-skill references only to kanmer-tickets' tool-reference, valid because the roster installs atomically as siblings (stated constraint, ADR-0009).
- R5. Release rail: any tool-surface change updates the tool reference; `plugin:build` + `plugin:check` + `verify-agents-block` gate every skills change.

**Acceptance:** grep finds zero hardcoded gate rules in any skill; an auto run over mixed-profile tickets produces the right per-profile paths; smoke-verified tool names match the reference.

Related: ADR-0009 · D36–D45 · FRD-005/009/010/012/013/014.

## Verified against code — Phase 0.2

- The roster today is **13** skills under `plugins/kanmer/skills/` — the twelve in the table above
  plus `kanmer-import`, whose removal (FRD-013) is what makes the end state twelve. The table's
  twelve names all exist as directories.
- R1 is **not yet true**, which is the work Phase 6 does. Gate rules are currently restated in
  skill prose — `kanmer-auto/SKILL.md` carries them, and `kanmer-plan/SKILL.md` refuses to plan on
  missing research from its own text rather than from `get_doc_gates`. Nine of the thirteen
  already call `get_doc_gates` (auto, execute, groom, plan, report, research, review, setup,
  verify), so the mechanism is in place; the prose deletion is not.
- R2 — `kanmer-auto/SKILL.md` partitions by file overlap into conflict-free waves today; the
  **profile**-aware partitioning is a v3 addition (profiles do not exist yet).
- R4 — the cross-skill dependency is real and load-bearing: every skill points at
  `kanmer-tickets/references/tool-reference.md`, valid only because Connect installs the roster as
  sibling directories. Install specs live in `apps/gui/src/main/providers.ts:163-248`.
- R5 — the rail is mechanized in `scripts/release.mjs:149-160`, which runs build, `plugin:check`,
  tests, both smokes, `verify:agents-block` and the GUI typecheck in that order. Note
  `scripts/agents-block.mjs` holds `BLOCK_BODY` as a literal that is duplicated by hand into
  `kanmer-setup/SKILL.md`, and `scripts/verify-agents-block.mjs:146-154` asserts the two stay
  byte-identical — so any AGENTS-block rewrite must change both.
- Acceptance — the "zero hardcoded gate rules" grep **fails today** and is the Phase 6 exit
  criterion, not a current property.
