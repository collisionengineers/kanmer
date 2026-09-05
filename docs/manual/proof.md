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
discharged by a hosted CI run for that same merge SHA, so the agent did not
have to re-run them locally.

Which run counts is the project's own **verification contract**, declared on
the board under `delivery.verification` — a workflow, the set of jobs that must
all be green, and the event that triggers them. Declare nothing and you get
Kanmer's own contract: the `pr.yml` `verify` job on the push to the integration
branch. A receipt is accepted only when it names the exact merge SHA, the
contract's workflow, one of the contract's jobs, the contract's event, and a
`success` conclusion — and the receipts together have to cover *every* job the
contract requires. Anything else is rejected and the obligation is verified the
old way, in the worktree.

If your CI does not run on pushes to the integration branch — for example it
runs on pull requests only — there is no run at the squash-merge commit, so
there is no receipt to have. That is the normal fallback, not a fault: the
verifier runs everything itself at the merge commit and the proof records
`receipts: []` with the reason. It is slower, and it is just as valid.
`receipts` is optional: a proof with none of them behaves exactly as it did
before this list existed, and no existing proof is rewritten to add one.
Receipts sit beside the attempt ledger, not inside it, and the same reader
validates both. It adds one rule about the document itself: a receipt naming a
different commit from the proof's own `merged_sha` makes the whole record
invalid, because a proof cannot claim to have verified one commit while
carrying evidence about another.

## When the proof itself is checked

`proof/proof.md` is a record, not an essay with a verdict stapled to the top.
A current record says `schema: 2` and carries an `attempts:` ledger where every
rerun is its own entry, with its own timestamp, result and exit code. Two rules
give the record its meaning:

- **The last attempt is the verdict.** The final entry must be marked
  `authority: authoritative`, and the top-level `result` has to agree with it.
  A rerun that failed cannot be filed as a supporting note underneath an earlier
  PASS — it has to become the verdict, or the record is refused.
- **The parts have to agree.** A PASS with a non-zero exit code, a FAIL with no
  failure class, attempts out of chronological order, a `verified_at` that does
  not match the last attempt: each of these is a contradiction the record cannot
  hold, and each is reported by name.

This exists because a proof that said PASS while its own body recorded a later
failing rerun once left a ticket looking finished for five days, and another
ticket was closed on the same shape of evidence and had to be reopened.

Whether that check *blocks* anything is your board's decision, in
`board.yml`:

- **`report`** — the reading appears as a warning and nothing is refused. Every
  board that predates this check starts here, because every proof written before
  it is, by definition, not a schema-2 record. Those older proofs are reported as
  *legacy*: described, never rewritten, and never quietly reinterpreted.
- **`strict`** — entering Done needs a valid PASS record at the exact merge SHA.
  Boards created from now on start here.

To move an existing board to strict, ask `migrate_board` for a dry run first. It
reads every ticket's proof and tells you how many are valid, legacy or
self-contradicting, with the diagnosis per ticket, and it changes nothing. If you
want to go ahead, hand the digest it gave you back to the same tool; anything
else — no digest, a stale one, a board that has changed since — is refused
without writing. Turning strict on never edits a single proof.
