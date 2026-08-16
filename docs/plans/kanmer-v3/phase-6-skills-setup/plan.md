# Phase 6 — Skills, templates & setup

**Goal:** the 12-skill roster rewritten for v3 (derive-don't-restate, profiles, folders, groups, deepened research, questioning prose), templates with identity headers, kanmer-docs' decision table, setup-as-reconciliation, and the AGENTS block as the orientation layer. Last, because skills freeze only after Phase 3's tool signatures.

**Depends on:** 3 (frozen tools; ideally 4/5 shipped for accurate GUI references). **Feeds:** Phase 7 (dogfood) and the adoption playbook.

## Items

### 6.1 Roster sweep — L (FRD-023 R1–R3) · [[SKILL-001]]
- All 12 skills: gate prose deleted in favour of `get_doc_gates`; six-stage + folder-path references; read-everything openings (incl. group context); questioning prose per skill (FRD-009 R2); kanmer-research rewritten per FRD-005 (quick/deep, source classes incl. live-estate CLIs); kanmer-auto profile-partitioned waves + files/-overlap lanes; kanmer-verify typed proof; kanmer-execute/plan living-docs duties; auto↔dispatch cross-references. **kanmer-import deleted.**

### 6.2 Templates — M (FRD-014) · [[SKILL-002]]
- Identity first-lines on every template; files template (two sections + contrast rule); per-proof-type templates; group + ticket template updates (groups/profile fields); research/summary template for deep mode.

### 6.3 kanmer-docs decision table — S · [[SKILL-003]]
- PRD/FRD/ADR table + the granularity test; doc-structure mirror regeneration retained.

### 6.4 Setup reconciliation — L (FRD-013) · [[SKILL-004]]
- The reconcile loop (AGENTS block, version steps, ingest): issue ingestion with list-then-confirm close flow + idempotent source links; per-item plan mining with the preview (N docs → M items → K tickets) + area seeding + custom-empty profiles; commit-history fallback; greenfield interview retained; stage-proposal prose removed.

### 6.5 AGENTS block rewrite — S · [[SKILL-005]]
- Orientation essentials: profiles exist; `get_doc_gates` before any move; read the whole ticket folder + group context; six stages; where the docs live. `verify-agents-block` updated to assert the new content.

## Release rail (hard)
- `tool-reference.md` final pass; `npm run plugin:build`; `npm run plugin:check`; `verify-agents-block`; README skills table → 12.

## Verification
- Greps: zero gate rules in skills; zero `impact.md`/priority/seven-stage references; identity line on every template.
- Scenario runs (scripted where possible): deep-research fixture produces subfolders + summary with sources; auto over a feature+chore+spike trio takes three different paths; setup on the Kanmer repo fixture backfills per-item done tickets idempotently and shows the issue-close list before acting.
- Full rail green: `npm test`, `smoke.mjs`, `plugin:check`, `verify-agents-block`.

## Adoption

Bringing any existing repo in line — including this one — is not part of this phase: it's the repo-agnostic [adoption playbook](../adoption-playbook.md), and Kanmer itself runs it in [Phase 7](../phase-7-self-adoption/plan.md).
