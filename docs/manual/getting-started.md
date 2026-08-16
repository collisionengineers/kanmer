Kanmer is a kanban board that lives inside your repository as ordinary markdown
files. There is no server, no account, and nothing to sign into. The board is a
folder called `.kanmer` in your project, and it works offline because there is
nothing for it to be online with.

That one decision is what the rest of this manual is downstream of.

## Why files

Because it means your coding agents and you are looking at the same board.

Not a summary of it, not an export, not an integration that syncs every few
minutes and disagrees in between — the same files. When an agent researches a
ticket, it writes the research into the ticket. When it moves a card, the card
moves on your screen. When you drop a mockup onto a ticket, the agent can open
it.

Most tools put an API between the human's view and the machine's. Kanmer puts a
folder there, which turns out to be enough, and has the useful property that
your work is diffable, greppable, reviewable and yours.

## The shape of it

A **ticket** is a folder with an id like `API-001`. It holds a few fields and up
to seven **documents** — research, files, plan, checklist, open questions,
post-implementation report, proof — each of which is a real piece of writing
rather than a text field.

Tickets sit in one of six **stages**, and those six are the same on every Kanmer
board:

**Backlog → Preparing → Implementing → Review → Verifying → Done**

All six are columns on one board, Backlog first — there is no second place to
look.

Alongside the stages, **areas** say what part of the product a ticket belongs to
and colour it accordingly, and **groups** collect tickets that ship together
(an epic) or that matter right now (a horizon).

## The one idea worth having up front

Boards usually let you move anything anywhere, which means the column a ticket
is in records what somebody clicked rather than what happened.

Kanmer attaches requirements to the **boundaries between stages**. How many
requirements depends on the ticket's **profile** — a two-line fix owes almost
nothing, a feature owes research and a plan and proof — so the board can be
strict without being bureaucratic about small work.

The result is that a ticket in Verifying really has merged, and a ticket in Done
really does have evidence behind it. Not because anyone was disciplined, but
because the board asked at the moment it mattered.

If a move is ever refused, **Why can't I move this?** explains both reasons it
can happen and what to do about each.

## Where to go next

- **Install and open a project** — if you have not yet.
- **Connect an agent** — the step that makes the rest of this worth doing.
- **Your first ticket, end to end** — one worked example, which is the fastest
  way to understand everything above.
- **The six stages** and **Profiles: what a ticket owes** — the two concepts the
  rest of the manual builds on.
