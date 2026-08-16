---
status: draft
covers: new (v3)
---

# FRD-004 — Reference files

## Overview

`reference/` holds **human-provided, non-generated inputs** a ticket's work depends on: example files for an extractor, UI mockups, screenshots of a bug, an API schema for a connector. Agents must consult them; they are inputs, never evidence.

## Requirements

- R1. Any file type is accepted (binary included); subfolders allowed.
- R2. **GUI:** the ticket editor offers add/upload (button + drag-drop onto the editor); reference files list with name/size; open externally on click; remove with confirm.
- R3. **Agents:** reference files are enumerated in `get_item`'s docs summary; text files are readable via `get_ticket_doc(id, "reference/<path>")`; binary files are surfaced as absolute paths for the host's own file access.
- R4. The read-everything duty (FRD-003 T9) explicitly names reference files; research and plan skills call them out as first-class sources (FRD-005).
- R5. Terminology discipline: "reference files" (this folder) vs "governing docs" (frontmatter `refs`, repo `/docs/` links) — never interchanged in any template, tool description, or GUI label.
- R6. Gate-exempt (FRD-003 T5).

## Acceptance criteria

1. Dragging `mockup.png` onto a ticket lands it in `reference/`; the agent's `get_item` shows it; a skill run on the ticket demonstrably consults it (its plan cites the mockup).
2. `get_ticket_doc(id, "reference/schema.json")` returns the text; `reference/sample.msg` is returned as a path.
3. No combination of reference files unblocks any stage move.

## Related
ADR-0004 · FRD-003 · FRD-005 · D43.
