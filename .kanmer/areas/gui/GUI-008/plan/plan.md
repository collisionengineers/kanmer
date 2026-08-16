# Plan — the profile picker

Two places ask "what kind of work is this?", and they are the two places a
person is already thinking about it: the create dialog and the editor.

In **TicketCreate** the picker takes the slot the Priority select used to
occupy. That is not coincidence — priority was the field people reached for when
they wanted to say "this one is different", and profile is the honest version of
that question.

In the **Editor** it sits beside Area, because those are the two fields that
decide what a ticket owes: area resolves the default, an explicit profile
overrides it.

Both offer an empty "— inherit —" option, which is not the same as `custom`.
Inherit means "resolve it from my area, then the board" (FRD-002 P6); custom
means "I am carrying my own requirements". Conflating them would make the
resolution chain invisible.

`profile` joins the editor's `FIELD_KEYS`, so it participates in the existing
diff-based save and the conflict detection — a profile changed on disk while the
editor is open behaves like any other field.

**Not done:** the inline `requires` editor for `custom`. Choosing `custom` from
the picker today leaves the requirements empty, which means no requirements —
honest, and the same thing the migration does for finished work. A real editor
for it needs the boundary/type vocabulary as a UI, which belongs with the
Profiles editor in GUI-007.
