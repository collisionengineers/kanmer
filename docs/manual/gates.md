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

### If it says "requires proof" and the proof is right there

On a board with strict proof validation, the proof requirement is not asking
whether a file exists. It is asking whether `proof/proof.md` is a valid, typed
proof record that says PASS. So you can be looking at a proof document and still
be refused — and the message tells you which of these it read:

> `…entering Done requires proof (profile "fix"). ` proof/proof.md ` predates the
> typed ` proof-record/2 ` contract and has never been validated. This board's
> proof policy is "strict"…`

The usual causes, in plain terms:

- **"predates the typed contract"** — an older proof, written before records were
  validated. Nothing is wrong with it; it simply carries no machine authority.
  Re-verify and write a current record.
- **"is a valid FAIL record"** (or INCONCLUSIVE) — the proof is honest and the
  answer is no. The ticket stays in Verifying; fix the thing and verify again.
- **"declares the typed proof contract and breaks it"** — the record contradicts
  itself, and the diagnosis after the dash says how: a top-level PASS whose last
  attempt failed, attempts out of order, a PASS with a non-zero exit code. This
  is the case the whole check exists for.
- **"there is no canonical `proof/proof.md`"** — the evidence is under `proof/`
  but not in the one document the gate reads.

If your board is in **report** mode instead, none of this blocks anything: the
same reading appears as a warning in the readiness panel, and the move goes
through. New boards start strict; older ones stay in report until someone
deliberately turns strict on, having first looked at what the existing proofs
say.

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

The GUI banner translates agent-only recovery instructions into the controls you
can use: open the ticket's document tabs to add what is missing, then use the
readiness panel at the top of the Ticket tab for the complete picture. A
multi-stage jump also points you to that panel for the next legal stage.

## When the gate is wrong

Sometimes the ticket really is smaller than its profile assumes. Changing the
profile is a normal, honest thing to do, and the gates re-evaluate the instant
you save it.

What is not worth doing is writing an empty document to get past a boundary. The
gate cannot tell the difference and you will not gain anything — the next person
to open that ticket, quite possibly you, will find a research document with a
heading and no research in it.
