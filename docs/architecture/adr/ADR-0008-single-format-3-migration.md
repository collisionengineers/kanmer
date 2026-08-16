---
status: draft
---

# ADR-0008 — One format-3 migration batches stages, folders, and priority removal

## Context

Fixed stages (ADR-0002), folder-per-type (ADR-0004), and priority removal (ADR-0006) all rewrite ticket files. Kanmer already has a proven migration vehicle: the GUI's one-press format-migration prompt with dry-run preview and blocker reporting (shipped for v1→v2).

## Decision

Bump `version.json` to format 3. One migration: (1) map `status:` values via a hardcoded alias table (todo/'to do'/'not started' → backlog; 'in progress'/doing → implementing; review → review; done/shipped → done; the v2 seven collapse into the six); unmappable statuses → Backlog + a `needs-restage` label, listed in the report. (2) Move loose pipeline docs into type folders. (3) Strip `priority:`. No interactive stage-mapping UI is built — known legacy boards map cleanly via the alias table, and anything else restages safely. Migration code is retained permanently (old clones/backups must remain openable), and this is expected to be the last board-shape migration for a long while, since standardization removes the main source of variance.

## Alternatives considered

(a) Three migrations — three prompts, three chances to half-migrate. (b) Interactive stage mapping — machinery for a population of one, rejected by the user. (c) Delete old migration code after — makes old checkouts unopenable.

## Consequences

One press upgrades a board completely; the alias table is the entire stage-migration surface; format detection gains one case.
