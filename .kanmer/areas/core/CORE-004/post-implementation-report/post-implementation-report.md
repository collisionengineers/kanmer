# Post-implementation report

Documents are folders; containment defines type, recursively.

**For review:** two behaviour changes worth a look.

`getTicketDocsInfo().docs` used to report every configured type with a boolean.
It now reports only types that actually hold something, derived from counts — an
absent type is an absent key, not `false`. Any caller doing `docs.proof ===
false` needs `=== undefined`; the smoke test had exactly that and was updated.

Scratch moved from `scratch-<slug>.md` beside the ticket into `scratch/<slug>.md`.
Consistent with every other type, and the migration relocates existing notes,
but it does change the path `get_ticket_doc` takes.
