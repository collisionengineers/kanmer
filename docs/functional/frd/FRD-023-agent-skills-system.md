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

> **Re-verified 2026-08-17 (SKILL-013).** The two statements below that said R1
> and its acceptance grep were unmet are **no longer true**; they are kept, struck
> through, with what replaced them. This section is dated evidence, so correcting
> it in place without saying what changed would destroy the record it exists to be.

- ~~The roster today is **13** skills~~ — it is **12**, measured by `ls`:
  `kanmer-import` is gone (FRD-013), and `scripts/verify-skill-prose.mjs` check 6
  asserts the count rather than leaving it to be re-counted by hand.
- ~~R1 is **not yet true**~~ — **R1 holds as of SKILL-013/SKILL-014**, and is now
  mechanized rather than asserted: `verify-skill-prose.mjs` check 7 reports zero
  profile-to-document mappings across the tree, and it is on the release rail.
  Two things were learned in making that true, both worth keeping:
  - **What R1 forbids needed stating as a rule, not a grep.** *A rule may be
    stated in prose iff its truth-value is independent of board configuration.*
    Structural invariants are legitimate; per-profile requirement lists are not.
    SKILL-014's first check approximated this by looking only at lines naming a
    boundary, which made the worst offender in the tree — the AGENTS block's own
    per-profile table — invisible to it.
  - **R1 has a second half a deletion check cannot see.** An invariant that *no
    tool reports* has prose as its only possible home, so its absence is a defect
    too. Check 8 asserts those are present where they can be acted on; before
    SKILL-013 "the board worktree is not yours" appeared in 1 of 12 skills and in
    none of the four that run git.
- R2 — `kanmer-auto/SKILL.md` partitions by file overlap into conflict-free waves today; the
  **profile**-aware partitioning is a v3 addition (profiles do not exist yet).
- R4 — the cross-skill dependency is real and load-bearing: every skill points at
  `kanmer-tickets/references/tool-reference.md`, valid only because Connect installs the roster as
  sibling directories. Install specs live in `apps/gui/src/main/providers.ts:163-248`.
- R5 — the rail is mechanized in `scripts/release.mjs`, which runs build, `plugin:check`,
  tests, both smokes, `verify:agents-block`, `verify:skills` and the typecheck across every
  workspace, in that order. The AGENTS block body is defined **once**, in
  `scripts/agents-block-body.mjs`; `scripts/agents-block.mjs` and the GUI's
  `apps/gui/src/main/agentsBlock.ts` both import it. Only the fenced copy in
  `kanmer-setup/SKILL.md` is still kept in step by hand — it is prose and cannot import —
  and `verify-agents-block.mjs` asserts the fenced region equals the canonical body exactly.
  (It was three independent copies until SKILL-013, and the GUI's had drifted to a v2 body
  that Connect wrote into real repositories.)
- ~~Acceptance — the "zero hardcoded gate rules" grep **fails today**~~ — it **passes**, and
  is a rail step rather than a grep run by hand. Validated against the pre-change tree
  before being trusted: 8 violations there, 0 after.
