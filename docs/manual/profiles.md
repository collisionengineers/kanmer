The six stages are the same on every board. What differs is how much evidence a
ticket has to produce to move through them — and that is a property of the
ticket, not of the board.

A **profile** is the answer to "how much does this one owe?"

## The five that ship

| Profile | Owes |
|---|---|
| **fix** | A files document and a plan before leaving Preparing; proof before Done. |
| **chore** | A plan before leaving Preparing; proof before Done. |
| **feature** | A linked governing document before leaving Backlog; research, a files document, a plan and a checklist before leaving Preparing; a post-implementation report before Review; proof before Done. |
| **spike** | Research before Done. Nothing else — a spike's output *is* the finding. |
| **capture** | Nothing. A recorded observation, not yet work — see below. |

There is also **custom**, which asks for nothing until you tell it what to ask
for, ticket by ticket.

Every profile except `spike`, `capture` and `custom` additionally requires that
the ticket's open questions are resolved at each of its boundaries. That is not
a document — see below.

## Quick capture

`capture` is the profile for the thing you noticed but cannot honestly size
yet. It needs a title and a body — the observation — and nothing else. You can
attach evidence, and you can leave it in Backlog forever; nothing will nag you
about it, because there is nothing it owes.

What makes it more than "a ticket with no documents" is the other half: a
capture **cannot** leave Backlog, cannot be taken, and is never picked up by an
autonomous run. It leaves that state only when someone records a decision about
it — it was a duplicate, it was already fixed, it joins a small batch of fixes,
it is real work with a real profile now, it stays a capture for now, or it no
longer matters. Whichever it is, the decision is written on the ticket.

That is the point. The failure mode captures prevent is the half-filed ticket:
a one-line observation that looks like planned work, gets picked up by whoever
is clearing the backlog, and turns out to be nobody's idea of a specification.
A capture is honest about being an observation until a human says otherwise.

Two limits worth knowing. The observation lives in the ticket body, so it is
searchable like any other ticket — but a capture with an empty title or an empty
body is refused, because those two are the whole record. And `capture` is not
usable as an **area** or board default profile: it is a choice you make about
one observation, not a weight you set for a whole area.

## Choosing one

**`fix` is the default.** A ticket you create without thinking about it is a
`fix`, and that is the right default: most work is small, and a board whose
default is `feature` teaches people to route around it.

Pick the profile on the New ticket dialog, or change it any time in the editor.
Changing it re-evaluates the gates immediately — a ticket that could not move a
moment ago may be free now, and that is a legitimate thing to do when the work
turns out smaller than you filed it as.

You can also set a **default profile per area** in **Settings → Profiles**, so
tickets filed in an area start with the right weight without anyone choosing.
A ticket's own profile wins over its area's, which wins over the board's.

## The cost of over-filing

This is the failure mode worth naming. Filing a two-line change as a `feature`
means it owes six documents, and what actually happens is not six good
documents — it is five empty ones written to unblock a move, plus everyone
learning that the gates are theatre.

Profiles are load-bearing only if a heavy one is a real signal. Use `fix` freely,
use `feature` when the change genuinely deserves research and a plan somebody
will read, and change the profile when you were wrong rather than writing
documents nobody needs.

Under-filing is the cheaper mistake: raise the profile and the missing documents
are asked for at the next boundary.

## "questions-resolved" is not a document

It is the one requirement that cannot be satisfied by writing a file. It asks
that the ticket's `open-questions` document has no unanswered questions left in
it — specifically, no unticked `- [ ]` lines.

You satisfy it in one of two ways: **answer the question and tick the box**, or
**move it under a `## Parked` heading with a reason for deferring**. Anything
below a Parked heading is not counted.

A ticket with no open-questions document at all satisfies it trivially, which is
the common case.

The point is that an unanswered question should block work rather than be
silently assumed away at the moment somebody starts coding. Parking is a real
answer — "we decided not to decide, here is why" is a decision — it just has to
be written down as one.

## Changing what profiles ask for

**Settings → Profiles** shows a grid: one row per profile, one column per stage
boundary, each cell a comma-separated list of what that profile requires there.
Edit a cell to change what your team owes.

You can also set each area's default profile here, and the list of proof types
your board recognises.

Invalid entries are flagged as you type and Save stays disabled until they are
fixed. Before saving, Kanmer tells you how many tickets the change will re-gate,
because loosening or tightening a profile takes effect on every existing ticket
at once.

Adding a whole new profile, or changing which profile is the board's default,
is not done here — those live in the board's configuration file.
