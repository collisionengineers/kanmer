Every Kanmer board has the same six columns, in the same order, and you cannot
add, rename or remove one.

**Backlog → Preparing → Implementing → Review → Verifying → Done**

## What each one means

**Backlog** — captured, not started. Everything you have decided is real but
have not begun. A ticket can sit here indefinitely and that is fine; a backlog
is a record of intent, not a queue of failures.

**Preparing** — everything before the code changes. Finding out how the thing
works today, working out which files the change lands in, deciding on an
approach, writing it down. Research and planning share one stage on purpose:
they interleave in practice, and splitting them produced a lot of moves that
told nobody anything.

**Implementing** — the code changes, in the ticket's own branch and working
copy. This stage ends when the pull request is open, not when the work "feels
done".

**Review** — before the merge. The change is checked against what the plan said
it would be. Feedback that is worth doing becomes its own ticket rather than an
unbounded review thread. Ends at the merge.

**Verifying** — after the merge. The shipped result is checked in the merged
product, and the evidence is written down. This is the column most boards do
not have, and it is the one that pays: *merged* and *works* are different facts,
and a board without a stage between them quietly treats a merge as proof.

**Done** — verified. Records and cleanup happen after the ticket lands here,
not before it.

## Why they are fixed

Configurable stages sound like flexibility and behave like drift. Once each
board has its own columns, nothing generalises: an agent's working practices
have to be re-taught per project, "what stage is it in" stops meaning the same
thing between two repositories, and every board slowly grows a column that means
"we are not sure about this one".

Fixing the six means a ticket in Preparing means the same thing everywhere, so
your agents already know how to work your board the first time they see it,
and so the requirements attached to the boundaries between stages can be shared
rather than reinvented.

What is *not* fixed is what a ticket owes to cross a boundary. That is the
profile's job, it is per board and per area, and it is where all the real
flexibility lives — see **Profiles: what a ticket owes**.

## Backlog is a column like the others

The first one, always present, with drag and drop and quick-add — and there is
no second place to look.

Kanmer did once give Backlog its own list view as well, on the argument that
scanning a long queue is a different activity from watching work in flight.
It was withdrawn: keeping the same tickets in two places cost more than the
list was worth. Filter and search on the board instead.

Archiving is how you retire a backlogged ticket you are not going to do. It
keeps the ticket and its documents on disk and searchable in the **Archived**
view, and takes it off the board. A backlog that is never pruned stops being
read.

## Moving tickets

Drag a card, use the arrow keys, use the card's right-click menu, or change the
stage in the editor.

Two rules apply, and both are covered in **Why can't I move this?**: a ticket
may owe documents before it can leave a stage, and a move may cross only one
guarded boundary at a time. Moving *backwards* is always allowed and never
asks for anything — you can always undo a move.

There is no priority field. Order within a column is whatever order you drag
cards into, and "what matters now" is expressed with a horizon group rather than
with a number that everyone sets to High.
