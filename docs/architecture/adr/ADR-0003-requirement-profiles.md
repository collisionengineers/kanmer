---
status: draft
---

# ADR-0003 — Requirement profiles replace per-area document sets

## Context

v2 configured required docs per area. But requirement weight tracks the nature of the work, not the area: a chore in the API area needs less than a feature in the same area. Forcing full pipelines on trivial tickets teaches agents to write junk docs.

## Decision

Named profiles defined in board.yml map stage boundaries → required doc types (`leave-preparing: [research, files, plan, checklist]`). Every ticket carries `profile:`; `custom` carries an inline `requires:` map (which may name specific files, e.g. `research/auth`). Shipped set: **feature / fix / chore / spike / custom** (work-type names — agents infer work-type from ticket content far better than they judge size, and feat/fix/chore is vocabulary they already know). Board default: `fix`. Areas keep only a *default-profile* (and default proof type) pointer — e.g. UI → feature + proof:visual.

## Alternatives considered

(a) Per-area doc sets (status quo) — wrong axis. (b) Size-named tiers (large/standard/small) — size is a proxy agents judge badly. (c) Per-ticket freeform only — no shared vocabulary, no defaults.

## Consequences

Requirements right-size per ticket; a spike's research IS its deliverable (Backlog → Preparing → Done, the middle stages never apply); intake gains a judgment moment (profile picking — a D4 asking point); the GUI Documents-per-area editor is replaced by a profiles editor.
