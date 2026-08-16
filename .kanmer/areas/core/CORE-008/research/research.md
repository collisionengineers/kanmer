# The group entity — research

Real boards were faking this with labels. One flat `labels: []` list carried
three unrelated things at once: which epic a ticket belonged to (`INT-14`),
which horizon it sat in (`now`, `next`, `post-alpha`), and its state
(`blocked` — despite real `blocks:` edges existing alongside it). Nothing
validated any of it, so a typo produced a label rather than an error, and the
three meanings could not be filtered apart.

The load-bearing decision is ADR-0001: **membership lives on the ticket**, and
member lists and progress are derived. The alternative — a members array on the
group — creates two homes for one truth, and they diverge the first time a
ticket is archived, moved between groups by hand, or deleted. Kanmer already
made this call once, for `blocks:`/blocked-by, and it has held.

Two kinds ship because the label data showed exactly two uses: "these ship
together" (epic) and "this is what matters now" (horizon). Kinds are declared in
board config rather than hardcoded, so a board that needs a third is not
blocked, but nothing is invented speculatively.

Archiving rather than deleting: deleting a group would orphan the membership
recorded on its tickets, and there is no second place to clean up from.
