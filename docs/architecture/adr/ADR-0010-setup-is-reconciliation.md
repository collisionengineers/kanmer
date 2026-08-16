---
status: draft
---

# ADR-0010 — Setup is reconciliation: every run brings reality into Kanmer

## Context

A dedicated import skill existed for GitHub issues only. Real setup needs are broader: repos hold issues, plan documents, and history that the board should reflect — including work already done. And Kanmer version updates need a post-update step.

## Decision

kanmer-import is removed (roster 13 → 12). kanmer-setup, whenever run, **ingests whatever exists that isn't Kanmer**: (1) GitHub issues → tickets, then closed on GitHub with a 'migrated to Kanmer (ID)' note — a destructive external action, so list-then-confirm, never silent; GitHub ceases to be a source of truth. (2) Existing plan/markdown docs → **done tickets, one per plan item** — mined items seed board structure (areas) and become the template for future work; the plan content lands in the tickets' `plan/`, verification content seeds `proof/`; historical tickets get profile `custom` with an empty requires-map (creation into Done is already ungated). (3) No docs → mine commit history, clustered by scope/tag. Setup also applies any Kanmer-version upgrade steps, so 'run setup after updating Kanmer' is the standing instruction. Idempotent and re-runnable by construction.

## Alternatives considered

(a) Keep kanmer-import for ongoing sync — overengineering for a workflow where issues stop being created; rejected by the user. (b) Coarse backfill (one ticket per plan doc) — loses the board-seeding value of per-item mining; rejected by the user.

## Consequences

One skill owns 'make the board reflect reality'; dogfooding is concrete (Kanmer's own docs/plans phases backfill as done tickets); setup grows and stays on the overload watchlist; idempotency machinery is mandatory, not optional.
