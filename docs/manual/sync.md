You are not the only one touching this board. An agent researching a ticket in
the background writes documents; a dispatched task moves cards. Kanmer's job is
to make that legible rather than startling.

## The board is live

Kanmer watches the board's files. When something changes on disk — an agent
writing a plan, a colleague's sync arriving, you editing a file in another
program — the board updates in place. There is no refresh button and there is
nothing to reload.

Updates are surgical. A changed ticket repaints that card, not the board. A
document you have open updates without losing what you are typing.

## Your own edits do not echo

When *you* move a card, Kanmer does not then notify you that a card moved. It
knows which changes it just made and ignores the file events they cause.

This sounds obvious and is the difference between a live board and an
irritating one: every notification you get is about something you did not do.

## Toasts, when you are watching

While Kanmer has focus, a change made by an agent slides in as a small toast —
*Agent updated TICKET-ID*, or a note that the board's configuration changed.
Click one to jump straight to the card. They clear themselves after a few
seconds.

If you have several projects open, a change in a background project tab puts a
dot on that tab instead of interrupting you in this one.

## Desktop notifications, when you are not

When the Kanmer window is not focused, changes surface as system notifications
instead — so you can leave an agent working and go and do something else.

They are batched: a burst of changes over a second or two arrives as one
notification rather than eleven, and a large burst collapses into a count. A
notification names the ticket and the stage it moved to; clicking it brings
Kanmer to the front and selects the card.

This is on by default. Turn it off in **Settings → Appearance**, under
**Notifications** — the checkbox reads *Toast when an agent changes the board
while the window is unfocused*.

## The activity feed

The bell in the header opens **Activity**: a running log of what happened to
this board, newest first, with a dot when there is something you have not seen.

Each entry says what changed, who changed it, and how long ago — a ticket
created, a stage move with its from and to, a document written or appended, a
ticket taken on a branch or released, a field edited. "Who" is the name of the
agent that did it, or the app itself when it was you.

Clicking an entry reveals the ticket it refers to.

The feed answers the question you actually have when you come back to a machine
that has been working without you: not *what does the board look like now*,
which you can see, but *what happened while I was gone*.

Two things worth knowing about it. It is local to this machine — it does not
travel between machines the way tickets do, because it is a record of what
happened in front of you. And it is derived: it is safe to delete, and it trims
itself rather than growing forever.
