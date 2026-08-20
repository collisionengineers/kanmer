# Open questions — GUI-096

All interaction and data-shape decisions are resolved.

- [x] **How are scratch names delivered without new IPC?** — Extend existing `TicketDocsInfo` returned by `getDocsInfo` with sorted `scratch` slugs populated from core `listScratch`.
- [x] **Is Scratch a pipeline document type or gate?** — No. It is a separate editor tab over `scratch/`, remains gate-exempt, and is not inserted into `docTypes`.
- [x] **How are notes read/written?** — Reuse existing `getDoc`/`setDoc` and `DocEditor` with path `scratch/<slug>` and content-version conflict handling.
- [x] **Can users create a note?** — Yes, through a validated new-slug control; no deletion in this ticket.
- [x] **Which note is selected initially?** — `review` when present, otherwise first sorted slug, otherwise empty state.
- [x] **What slug forms are accepted?** — One safe lowercase-kebab slug; reject blank, slash/backslash, dot segments, traversal, invalid characters, and duplicate names before selecting/creating.
- [x] **Which group context is shown?** — `item.groups[0]` only, exactly as seeded.
- [x] **Is group context editable in the ticket editor?** — No. Read-only rendered Markdown above Body; group editing remains in GroupView.
- [x] **What if context is missing?** — Show a compact explicit missing-context pane; do not add a gate or silently substitute another group.
- [x] **Does this create a fourth application view?** — No. It is content inside the existing ticket editor.
- [x] **Does it require MCP/plugin/manual changes?** — No. DOC-011 owns governing documentation; keep `docs_todo` until linked.

## Parked (explicitly deferred)

No questions are parked.
