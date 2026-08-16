One worked example, start to finish. It is worth doing once on something real
but small, because the five chapters after this one will make considerably more
sense afterwards.

## 1. Create it

Press **N**, or use the quick-add row at the top of a column.

Give it a title that says what will be true when it is done. Pick an **area** if
you have set some up. Leave the **profile** alone for now — you will get `fix`,
which is the right default for most work.

The ticket appears in Backlog with an id like `API-001`.

## 2. Decide what it owes

Open it. At the top of the Ticket tab is the readiness panel: the profile, and a
row for each upcoming boundary showing what is required and whether it exists
yet.

A `fix` wants a files document and a plan before it can leave Preparing, and
proof before it can reach Done. That is the whole contract, visible up front.

If this is a bigger piece of work than a `fix`, change the profile now — the
panel updates immediately.

## 3. Let an agent prepare it

With an agent connected, you have two ways to do this.

**Ask it.** "Have a look at API-001 and work out what it touches." The agent
reads the ticket from your board, does the work, and writes into the ticket's
documents. You watch the board change while it does.

**Or dispatch it.** Right-click the card → **Dispatch to agent** → your agent →
**Map files**. That starts a background agent whose only job is to produce the
files document, and it stops when the document exists. The card shows an
**⏳ agent** chip while it works.

Then dispatch **Write plan + checklist**, or ask for it.

Read what comes back. This is the part that matters: the plan is a document you
are going to act on, and if it is wrong it is much cheaper to fix now.

## 4. Move it to Preparing

Drag the card. If it refuses, the message says what is missing — see **Why can't
I move this?**

Note what just happened: you did not move it because you had finished thinking
about it, you moved it and Kanmer checked whether you had.

## 5. Implement

Dispatch **Execute checklist**, or work it yourself.

An agent doing this takes the ticket first — the card grows a **⛏** badge with
the branch name, so the board shows the work is live and no second agent picks
it up. It works through the checklist, ticking boxes as it goes, and finishes by
writing a post-implementation report and opening a pull request.

You can watch the boxes tick in the checklist tab.

## 6. Review, merge, verify

Move to Review, read the change against what the plan said it would be, merge.

Then move to **Verifying** — and this is the stage most boards do not have.
The change is merged; the question is whether it works. Dispatch **Verify +
write proof**, or do it yourself: run the thing, capture what actually happened,
and write it into the proof tab.

## 7. Done

Move to Done. It will refuse if there is no proof.

## What you should take from that

The board did not manage you. At each boundary it asked one question — *have you
got the thing this kind of work owes?* — and it asked before letting the ticket
claim it had moved on.

And every artefact along the way is a file in your project, which is why the
agent could do most of the work: you and it were reading and writing the same
board, not exchanging descriptions of one.
