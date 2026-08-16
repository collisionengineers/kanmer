# The group detail view - research

The question this view has to answer is "what is the state of this batch of
work", and the honest answer is derived: which tickets name this group, where
each one sits, and how much is finished.

The design risk is the opposite of the usual one. The obvious UI - a members
list you can drag tickets into - would be *wrong*, because it implies the group
owns its membership. ADR-0001 puts membership on the ticket precisely so there
is one home for it. A view that appears to let you edit the list from the group
side would put the model back into the state the ADR rejects, and the first
divergence would be silent.

So the member table is read-only, and its empty state says where membership
actually lives rather than offering a button that cannot exist.

The other half is shared context. The whole point of a group having a folder is
that the constraint binding these tickets is written **once**, and every
member's agent reads it (FRD-001 G6). That makes `context.md` the one document
worth surfacing directly rather than behind a file list.
