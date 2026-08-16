You dragged a card and it bounced back with a red banner. There are exactly two
reasons that happens, and the message tells you which.

## "…requires …"

The ticket owes a document it has not got.

> `API-003 cannot move from "verifying" to "done": entering Done requires proof
> (profile "fix").`

Read it as: *this profile, at this boundary, wants this*. The fix is to write
the thing, or to decide the ticket is not the size you filed it as and change
its profile.

**Where to look:** open the ticket. At the top of the Ticket tab is a readiness
panel — the profile, then a row per upcoming boundary with a tick or a circle
against each requirement. Click a requirement and it opens the tab where that
document goes. That panel is the same information as the refusal, except you can
see it before you try.

You can also see it during a drag: columns you cannot drop into are tinted, and
hovering one tells you what it is waiting for. The card's right-click **Move
to** menu greys out the stages that would be refused, with the reason.

### If it says "questions-resolved"

That one is not a document, and the message says so:

> `"questions-resolved" is not a document: open-questions/ still has unticked
> "- [ ]" lines. Answer them and tick the box, or move them under "## Parked
> (explicitly deferred)" with a reason for deferring.`

Do exactly that. Answer the question and tick it, or park it with a reason.
Parking is a legitimate answer.

### If it says "governing-doc"

The ticket has not been tied to any of your project's own documents — the
product or design writing the work is meant to serve. Link one, or mark that
one still needs writing. Only `feature` asks for this, and only on the way out
of Backlog.

## "…crosses N document gates"

The second refusal is not about what is missing. It is about how far you tried
to jump.

> `API-003 cannot move from "backlog" to "done" in one step: that crosses 3
> document gates (leaving Backlog, leaving Preparing, entering Review). A single
> move may cross one. Move one stage at a time — the next is "preparing".`

Every document can exist and this still refuses. That is not a bug, and it is
the refusal people find most surprising, so it is worth being plain about why:
the stages are meant to be **walked**. Dragging a ticket from Backlog to Done
records that it passed through Preparing, Implementing, Review and Verifying —
which is a claim about work nobody did. A board where that is possible is a
board where the columns are decoration.

The message names the next legal stage. Move there, then move again.

## Two things that never refuse

- **Moving backwards.** Any move to an earlier stage is always allowed and
  never asks for anything. You can always undo.
- **Creating a ticket.** A new ticket can be created directly into any stage.
  Gates guard *movement*, on the assumption that if you file something as
  already in Review you know what you are claiming.

## A note on the wording

These messages are written for the agents that most often trip them, so they
mention `set_ticket_doc` and `get_doc_gates` — the tools an agent would use to
write a document or inspect the gates. You will see those names in the banner.

For you, they mean: *write the document in the ticket's tab*, and *the readiness
panel at the top of the Ticket tab shows the whole picture*.

## When the gate is wrong

Sometimes the ticket really is smaller than its profile assumes. Changing the
profile is a normal, honest thing to do, and the gates re-evaluate the instant
you save it.

What is not worth doing is writing an empty document to get past a boundary. The
gate cannot tell the difference and you will not gain anything — the next person
to open that ticket, quite possibly you, will find a research document with a
heading and no research in it.
