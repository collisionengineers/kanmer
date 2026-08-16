---
status: draft
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
