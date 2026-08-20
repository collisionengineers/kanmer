# Open questions — GUI-097

- [x] **Is editor mode persisted workflow state?** — No. It is local presentation state only.
- [x] **What are the exact mappings?** — Approval→Ticket, Execution→Plan, Review→Scratch, Evidence→Proof.
- [x] **What if the mapped document/note does not exist?** — Open that surface’s existing empty/create state; do not silently fall back.
- [x] **Are other tabs hidden or disabled?** — No. They remain visible/clickable and are only visually dimmed.
- [x] **Can users switch mode?** — Yes, through a compact selector; use the existing dirty-document confirmation before changing starting tab.
- [x] **Does item refresh reapply mode?** — No. Apply on editor open or explicit mode change only.
- [x] **What mode do ordinary board/card/wiki opens use?** — Approval.
- [x] **What mode may dispatch/execute entry use?** — Execution, without changing dispatch eligibility or ticket status.
- [x] **Is mode restored across sessions?** — No; a restored selected ticket opens Approval.
- [x] **Does mode infer from ticket stage?** — No. Stage and mode remain independent.
- [x] **Does this add IPC, views, gates, or schema fields?** — No.

## Parked (explicitly deferred)

No questions are parked.
