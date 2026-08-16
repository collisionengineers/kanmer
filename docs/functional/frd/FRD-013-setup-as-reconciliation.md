---
status: draft
covers: shipped kanmer-setup (greenfield/brownfield/upgrade, AGENTS block) + reconciliation, issue ingestion, per-item backfill (v3); replaces kanmer-import
---

# FRD-013 — Setup as reconciliation

## Overview

Setup has one verb: **reconcile** — make the board reflect reality, including the past. Run it to install Kanmer, run it after updating Kanmer, run it whenever board and reality drift. kanmer-import is removed; ingestion is setup's job.

## Requirements

- R1. **Every run**, setup detects state and reconciles: (a) install/refresh the AGENTS block + gitignore wiring; (b) apply any Kanmer-version upgrade steps (e.g. prompt `migrate_board` when the format is old); (c) ingest what isn't Kanmer.
- R2. **GitHub issues → tickets**, then the issues are **closed on GitHub with a "migrated to Kanmer (<ID>)" comment**. Destructive external action: list exactly what will be closed, confirm, then act — never silent. Idempotent (source-linked; re-runs skip ingested issues). Consequence stated to the user: GitHub stops being a source of truth here.
- R3. **Historical backfill:** existing plan/markdown docs are mined into **done tickets, one per plan item** (D41) — the plan content lands in `plan/`, verification content seeds `proof/`, profile `custom` with an empty requires-map (creation into Done is ungated). Mined items propose the board's **areas**. Preview with counts (N docs → M items → K tickets) before creating anything.
- R4. **No docs → commit history**, clustered by conventional-commit scope/tag, same preview-first flow.
- R5. **Greenfield** keeps the brief interview (deepest questioning, FRD-009 R2) and materializes the `/docs/` tree; ticket seeding is created with `refs` per the governing docs.
- R6. Setup no longer proposes stages (fixed, FRD-007); it proposes areas, group kinds beyond defaults if the brief warrants, and the default profile.

## Acceptance criteria

1. Running setup on Kanmer's own repo backfills its `docs/plans/` phases as done tickets per item, seeding areas — and a second run creates nothing.
2. Issue ingestion shows the exact close list first; after confirm, each issue is closed with a comment linking its ticket id.
3. Running setup after a Kanmer update on a format-2 board leads with the migration prompt.
4. `verify-agents-block` passes after any run.

Related: ADR-0010 · D37/D40/D41 · FRD-007 · FRD-009 · FRD-002 G3.
