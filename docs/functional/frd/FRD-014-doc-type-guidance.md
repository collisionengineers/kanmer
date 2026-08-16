---
status: draft
covers: new (v3): the guidance layer for doc types & templates
---

# FRD-014 — Doc-type guidance

## Overview

Doc-type confusion is a proven failure mode — for agents *and* for the humans steering them. The guidance lives at the exact moment of writing: template first lines and a decision table.

## Requirements

- R1. **Identity headers:** every template's first line names its type and its nearest confusion, e.g. *"You are writing an ADR. An ADR records ONE decision. If you're describing what a feature does, stop — that's an FRD."* The files template opens with the contrast rule: *"research = what you learned; this file = where the change lands — paths only, no findings"* and carries the two sections **Files to change** (path + why + risk) and **Context files** (path + what it tells the implementer).
- R2. **The decision table** in kanmer-docs: PRD = why the product needs it (one per initiative — a coherent goal spanning features); FRD = what ONE feature does, with acceptance criteria; ADR = why it's built this way — one decision, superseded never edited. Plus the **granularity test**: *one crisp acceptance list, one "done" — else split* (added after it caught the FRD authoring in this very project).
- R3. Per proof type, a template stating what evidence looks like (FRD-006 R1).
- R4. The kanmer-docs skill regenerates `docs/contributing/doc-structure.md` as the human-readable mirror of the board's doc config (shipped convention, retained).

## Acceptance criteria

1. Every shipped template's first line passes the identity check (grep-verifiable).
2. kanmer-docs, asked "which doc do I write for X?", answers from the table with the granularity test applied.
3. The files template's two sections appear in every migrated and newly created files doc written by skills.

Related: D6/D8 · R8b correction · FRD-003 T4 · FRD-006.
