Two ways of clustering tickets, answering two different questions. **Areas**
answer *what part of the product is this?* **Groups** answer *what does this
belong with?*

## Areas

An area is a part of your work: the API, the GUI, the docs, the release
machinery. Every board starts with one, and you make the rest.

An area does three things:

- **It colours and clusters cards.** Inside every stage column, cards group
  under a sub-header for their area, each with its colour. Tickets with no area
  fall into a bucket at the bottom.
- **It gives a ticket its id.** A ticket created in an area with the prefix
  `API` is `API-001`, then `API-002`. That id is a birth certificate, not an
  address: move the ticket to another area later and the id does not change, so
  every link to it keeps working.
- **It can set a default profile**, so tickets filed in an area start owing the
  right amount without anyone remembering to choose.

Edit them in **Settings → Board**. Each row has a colour swatch, an editable
name, arrows to reorder, and a delete — which warns you first if tickets are
still using it. Add one by typing a name.

The id and its prefix are shown but not editable, because changing a prefix
would orphan every id already issued from it.

## Groups

A group is a set of tickets that belong together for a reason that is not
"same part of the codebase". Two kinds ship:

- An **epic** means *these ship together*. It is a deliverable made of several
  tickets, and it is done when they are.
- A **horizon** means *this is what matters now*. It is a time box, not a
  feature: what this month is about, what the next release contains.

A ticket can be in several groups — typically one epic and one horizon, since
those answer different questions.

## What a group holds

More than a name. A group is a folder with a goal written in it, and any other
documents you add sit beside that goal as **shared context for every ticket in
the group** — the brief, the constraint everyone keeps forgetting, the decision
that applies to all of it. An agent working any member ticket can read them.

That is the thing a label cannot do. A label is a word; a group is a place to
put the paragraph that would otherwise be repeated in nine tickets or, more
likely, in none.

Progress is worked out live from the members, so a group always shows the true
state of its tickets — including how they are spread across the stages — without
anyone maintaining a count.

## Working with them

Group chips appear on cards. Click one and every view filters to that group;
the filter bar has an **All groups** dropdown and a button to open the group
itself, which shows its goal, its shared context, its members and a progress
bar.

Creating a group is still an agent's job today. Ask your connected agent —
"make an epic for the checkout rewrite" — and the group appears on your board.
To put an existing ticket into one, open that card's context menu and choose
**Add to group**, then select an active group. Existing memberships are kept,
and a ticket already in a group is shown as unavailable rather than duplicated.

You can see, filter by, open, and assign tickets to groups in the app; creating
or archiving a group remains an agent action.

Groups are archived rather than deleted, so a finished epic stops cluttering the
board without taking its history with it.
