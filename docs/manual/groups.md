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

Creating a group, and putting tickets into one, is an agent's job today. Ask
your connected agent — "make an epic for the checkout rewrite and put these
four in it" — and the group appears on your board with its chips on the cards.
There is no New group button and no add-to-group control in the app yet.

That is a real gap and worth saying plainly rather than dressing up: you can
see, filter by, and open groups in the app, but you cannot currently build one
in it.

Groups are archived rather than deleted, so a finished epic stops cluttering the
board without taking its history with it.
