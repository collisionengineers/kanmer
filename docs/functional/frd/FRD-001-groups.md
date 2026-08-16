---
status: draft
covers: new (v3); replaces the label conventions observed in real use
---

# FRD-001 — Groups

## Overview

A **group** is a cross-cutting, kind-typed collection of tickets with its own folder and shared context. Groups answer "these tickets ship together" (kind `epic`) and "this is what matters now" (kind `horizon`) — the two concepts real boards were faking with labels.

## Entity & storage

- G1. Kinds are declared in `board.yml` with id prefixes, using the existing id machinery. **Shipped defaults: `epic` (prefix `EPIC`) and `horizon` (prefix `HZN`)** — both are required on day one by the label migration and the board-scale filter.
- G2. A group is a folder: `groups/<ID>/<ID>.md` — frontmatter `kind`, `title`, optional `archived`; body = the goal. Any other files in the folder are **shared context docs**, free-form, readable by every member ticket's agent.
- G3. **Membership lives on tickets** (`groups: []`, validated against existing group ids). Member lists and progress (per-stage counts) are **derived** — never stored on the group (ADR-0001).
- G4. Deleting = archiving; members are untouched; archived groups drop out of chips/filters but remain readable.

## Tools

- G5. `create_group(kind, title, body?)` · `get_group(id)` (frontmatter + body + derived members with stages + progress) · `list_groups(kind?, include_archived?)` · `get_group_doc(id, path)` / `set_group_doc(id, path, content)`. Membership rides `update_item(groups: [...])`; no dedicated add/remove tool (matches labels/blocks).

## Behaviour

- G6. **Skills read group context**: research/plan/execute begin by reading the ticket's groups' shared docs (part of read-everything, FRD-003 T9); the AGENTS block states it.
- G7. **Label→group migration** (kanmer-groom): propose a mapping from label conventions (capability-id labels → `epic` groups; `now`/`next`/`post-alpha` → `horizon` groups; `blocked` labels → real `blocks:` edges), preview counts, apply on confirm. Idempotent.
- G8. GUI surface (specified in FRD-011/019): group chips on cards (click → filter), a group dropdown in the FilterBar, and a **group detail view** — the group doc, its shared files, and the derived member list with stages/progress.

## Acceptance criteria

1. `EPIC-001` with `context.md`; three member tickets across two areas; `get_group` derives all three with stages; archiving one member updates progress with no group-file write.
2. An agent researching a member ticket demonstrably consulted `groups/EPIC-001/context.md`.
3. On a board using label conventions, the migration converts capability-style labels (e.g. `INT-14`) to epic groups and horizon-style labels (`now`/`next`/`post-alpha`) to horizon groups, preview-first — and re-running proposes nothing.
4. A `horizon` filter (`NOW`) narrows every view (board + backlog) to its members.
5. No file anywhere stores a group's member list.

## Related
ADR-0001 · D2/D9/D10/D15/D17/D18/D23/D26 · FRD-011 · FRD-019.
