---
status: draft
covers: v2 doc pipeline + scratch/assets (shipped) + folder storage, unlimited docs, living-docs (v3)
---

# FRD-003 — Ticket documents

## Overview

Every ticket owns a folder; every document type is a **subfolder** of it. Containment defines type — anything under `research/` is research, recursively. Documents are unlimited per type. This makes typing structural (agents cannot drift on a naming convention) and gives multi-topic research, multiple proofs, and human inputs a native home.

## Storage

- T1. Ticket folder layout (`areas/<area>/<ID>/`): `<ID>.md` (the ticket) plus type folders **`research/`, `files/`, `plan/`, `checklist/`, `open-questions/`, `post-implementation-report/`, `proof/`, `scratch/`, `reference/`, `assets/`**.
- T2. Containment is recursive: `research/azure/tokens.md` is research. Subfolders are free-form.
- T3. Folders are created **on first write**, never at ticket creation (a chore is never born with nine empty folders).
- T4. `files/` replaces v2's `impact` type: it maps where the change lands — *files to change* and *context files* (template spec in FRD-014). `scratch/` is the provisional notepad; `assets/` holds binaries embedded by docs; `reference/` holds human-provided inputs (FRD-004). `open-questions/` carries the questions only the user can answer, plus the assumption a headless run took in their absence (FRD-005 R3, FRD-009 R3) — it is a v2 type carried forward, and no shipped profile requires it.
- T5. **Gate-exempt folders:** `reference/`, `scratch/`, and `assets/` never satisfy a gate — inputs and provisional notes are not evidence. All other type folders satisfy their type's requirement with ≥1 `.md` anywhere beneath them (FRD-002 G5).

## Tools & surfaces

- T6. `set_ticket_doc(id, path, content)` / `get_ticket_doc(id, path)` take type-relative paths (`research/azure/tokens.md`; bare `research` resolves the folder's index or listing). `append_scratch` keeps its role. Invalid types are rejected with the valid list.
- T7. `get_item`'s docs summary reports per-type counts (and checklist progress as today); the GUI editor's doc tabs group by type with a per-type document list.
- T8. Agents may create any additional `.md` under a type folder; unknown *top-level* folder names are rejected (the type vocabulary is board config, FRD-014's identity discipline depends on it).

## Cross-cutting duties (requirements, not features)

- T9. **Read-everything:** any task on a ticket begins by examining the whole ticket folder — body, all docs, reference files — and the ticket's groups' shared context (FRD-001). Enforced across contract layers: skill prose, tool descriptions, AGENTS block (ADR-0009).
- T10. **Living documents:** `files/` is written before planning and **updated** whenever planning or implementation discovers new touched files; the same maintenance duty applies to other docs as later stages learn. Skills state it; kanmer-review checks the plan/files still match the diff.

## Acceptance criteria

1. `set_ticket_doc(id, "research/azure/tokens.md", …)` round-trips; the leave-Preparing research requirement is satisfied by it alone.
2. A ticket with only `reference/mockup.png` and `scratch/notes.md` satisfies **no** gate.
3. Creating a chore ticket produces exactly one file on disk (`<ID>.md`).
4. The format-3 migration relocates `research.md` → `research/research.md` and `impact.md` → `files/impact.md` byte-preserved.
5. The editor lists three research docs under one Research tab.

## Related
ADR-0004 · FRD-002 (gates) · FRD-004 (reference) · FRD-005 (deep research) · FRD-014 (templates) · FRD-007 (migration).

## Compiled-workflow end state (ADR-0016)

The audience contracts use existing storage: ticket body plus first-group context for approval; plan, checklist, and files for execution; `scratch/review.md` for review; and `proof/proof.md` for evidence. Scratch remains gate-exempt even when the Editor exposes it as a read/write top-level tab. The first group context is read-only context above the ticket body. Review and proof are whole-file versioned replacements; their detailed record schemas belong to FRD-006 and FRD-022 rather than duplicated here.
