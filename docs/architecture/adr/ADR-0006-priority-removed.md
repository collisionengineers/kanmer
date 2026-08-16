---
status: draft
---

# ADR-0006 — Priority is removed entirely

## Context

Real boards showed priority carrying no information (an entire production board uniformly MEDIUM) — a field agents fill arbitrarily. Its two real jobs are covered better elsewhere.

## Decision

Remove `priority` from schemas, tools, GUI, filters, and templates. Old files carrying `priority:` are passthrough-preserved on read/rewrite (the exact `due`-removal precedent). Replacements: horizon-kind groups ('what now') and manual card ordering (within-column rank).

## Alternatives considered

(a) Freeze as fixed low/medium/high — keeps a dead field alive. (b) Keep configurable — the status quo that produced all-MEDIUM boards.

## Consequences

One less arbitrary field; less prompt surface; migration strips it (ADR-0008); anyone who truly wants priority can model it as a group kind.
