---
status: draft
---

# ADR-0004 — Folder containment defines document type; documents are unlimited

## Context

Gates checked fixed filenames (`research.md`), capping each type at one document. Users need multiple research docs, human-supplied inputs, and unambiguous typing that agents cannot drift on.

## Decision

Every doc type is a folder inside the ticket folder — `research/`, `files/`, `plan/`, `checklist/`, `open-questions/`, `post-implementation-report/`, `proof/`, `scratch/`, `reference/`, `assets/`. Anything inside a type's folder (recursively — subfolders allowed, e.g. `research/azure/`) is that type. A gate is satisfied by ≥1 `.md` under the required type's folder; custom profiles may require named files. Folders are created on first write, never at ticket creation. `reference/` holds human-provided, non-generated inputs (example files, mockups, bug screenshots, API schemas) — terminology kept strictly apart from the frontmatter `refs` field (governing repo docs).

## Alternatives considered

(a) Typed filenames (`research-auth.md`) — a naming convention agents can violate; rejected in the shaping session. (b) Hybrid loose-files-plus-folders — two conventions to learn.

## Consequences

Typing is structural, not lexical; multi-doc research and deep-research fan-out (FRD-002) fit natively; doc tools accept nested paths; the restructure rides the format-3 migration (ADR-0008).
