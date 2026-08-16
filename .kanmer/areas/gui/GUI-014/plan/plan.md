# Plan

Render as an aside beside the board, like the editor, so a group reads as
another thing you open rather than a separate mode.

Progress shows both the bar and the per-stage counts. The bar answers "how far",
the counts answer "where is it stuck" - and the second question is the one a
horizon group exists to answer.

Archived members are shown greyed and excluded from the totals, matching what
`deriveMembers` computes. The count line says how many are archived rather than
silently dropping them, because a group whose members mostly got archived looks
identical to an empty one otherwise.

`context.md` is edited in place with an explicit Save. No autosave: this is
shared context that other agents read, and a half-typed sentence being picked
up mid-edit is worse here than in a private note.

Archiving is the delete. Deleting a group would orphan the membership recorded
on its tickets, and there is no second place to clean that up from.
