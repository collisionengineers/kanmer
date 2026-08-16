# Plan — remove priority from the UI

Four surfaces, all mechanical, all in the same commit as the schema change
because the renderer would not compile otherwise:

- `Board.tsx` — the `.pri` badge and its colour lookup.
- `FilterBar.tsx` — the "All priorities" select.
- `Editor.tsx` — the Priority field.
- `Settings.tsx` — the Priorities column editor and the default-priority
  preference.

`TicketCreate.tsx` is the one that is not a deletion: its Priority select
becomes the **Profile** picker (GUI-008), because the create dialog is exactly
where the question "what kind of work is this?" should be asked. Priority was
never load-bearing there; profile is.

`settings.defaultPriority` stays in the settings file, unread. Removing a
persisted key would make an older Kanmer's settings file lossy on a downgrade,
and it costs nothing to leave.
