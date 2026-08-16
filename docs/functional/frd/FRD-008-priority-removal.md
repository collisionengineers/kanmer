---
status: draft
covers: removal of a shipped field (v3)
---

# FRD-008 — Priority removal

Priority is removed entirely: the field carried no information in real use (uniform MEDIUM boards) and its two jobs are covered better — "what now" by horizon groups (FRD-001), within-column rank by manual ordering (shipped).

- R1. `priority` leaves the item schema, all tool parameters, all templates, the FilterBar, cards, and the settings editor; `priorities:` leaves `board.yml`.
- R2. Old files carrying `priority:` are **passthrough-preserved** on read/rewrite (the `due`-removal precedent); the format-3 migration strips the key with a count in the report.
- R3. Column tools' kind enum drops `priority` (and `status`, FRD-007), keeping `area`.

**Acceptance:** an old file with `priority: high` round-trips untouched pre-migration and loses only that key post-migration; no tool accepts a priority argument; the GUI renders no priority anywhere; grep of templates/skills finds zero priority references.

Related: ADR-0006 · D25 · FRD-007 (migration).
