Proof is the last thing a ticket owes, and the one requirement that does not
bend. Everything else on a ticket is somebody's account of the work. Proof is
what you can show.

## Evidence, not description

The distinction is the whole idea. A post-implementation report says *what was
built*; it is written by the author, before the change merges, and it is a
claim. Proof is gathered **afterwards, from the merged result**, and it is
evidence.

"The retry path is covered by tests" is a claim. The output of the test run,
pasted in, is proof. "It looks right in dark mode" is a claim; the screenshot is
proof. The difference is whether a reader has to trust you.

Compiling is not evidence. Neither is a green tick on a branch that has not
landed.

## The three kinds

Kanmer ships three proof types, and a ticket's profile can ask for one
specifically:

| Type | What it wants |
|---|---|
| `visual` | A screenshot or recording of the actual result. Something a reader can look at without running anything. |
| `test-output` | The output of the run that actually happened — the command, and what it printed. Not a summary of it. |
| `command-log` | What you ran and what came back, in order. The transcript, for changes whose result is a behaviour rather than a picture. |

A profile can ask for proof in general (`proof`) or for a kind
(`proof:visual`), and on boards that track deployments it can ask for proof from
a particular environment.

If your team wants different kinds, the list is editable in **Settings →
Profiles**.

## What Kanmer checks

The gate itself is simple: the ticket must have something written under proof
before it can enter Done.

On top of that, a ticket asked for **visual** proof gets a nudge. If no image
has been added under proof, Kanmer says so — *expects a screenshot, but no image
files were found* — and then **lets the move through anyway**, telling you to
check it yourself.

That is not a loophole; it is honest about what a tool can know. Kanmer can tell
whether an image exists. It cannot tell whether the image shows the thing you
claimed, and pretending otherwise would train you to satisfy the checker instead
of the reader. The other two kinds have no automatic check at all, for the same
reason.

## Why the last gate is the strict one

A ticket in Verifying has merged. The change is in the product. The only
question left is whether it does what it was supposed to do, and Verifying
exists because "merged" and "works" are different facts that get conflated the
moment there is no column between them.

Skipping proof does not save the work — it just moves the discovery of a problem
from you to whoever hits it next.

## Doing it

Move the ticket to Verifying when the change has merged, gather the evidence
from the merged result, write it into the proof tab, then move to Done. If you
are dispatching this to an agent, the verify task is deliberately unavailable
until something has merged, and it will tell you so.

## Receipts

A proof's `attempts:` list is what an agent actually ran in a detached
verification worktree at the merge commit. Beside it, `receipts:` is
additive evidence that some of a ticket's obligations were already
discharged by a hosted CI run — the exact push-to-`main` `verify` job for
that same merge SHA — so the agent did not have to re-run them locally. A
receipt is accepted only when it names the exact merge SHA, the `push`
event, a completed `verify` job, and a `success` conclusion; anything else
is rejected and the obligation is verified the old way, in the worktree.
`receipts` is optional: a proof with none of them behaves exactly as it did
before this list existed, and no existing proof is rewritten to add one.
This is foundational plumbing for the typed, versioned `attempts[]` record
that a later release validates for internal consistency — receipts sit
beside that ledger, not inside it.
