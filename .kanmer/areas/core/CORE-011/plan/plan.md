# Plan

## The rule

**A single move may cross at most one gated boundary.** A gated boundary is one
the resolved profile declares with at least one requirement; a declared boundary
with an empty requirement list is vacuous and does not count.

Both rules I proposed in the ticket body are dropped, for reasons the research
turned up:

- **R2 (timestamps)** — unimplementable. The activity log is gitignored and git
  does not carry mtimes, so neither timestamp survives a clone; and even with
  both committed, nothing in the board records when the *code* was written, so
  the comparison cannot distinguish code-then-plan from plan-then-code.
- **R1 as stated ("`done` only from `verifying`")** — contradicts a shipped
  acceptance case. A `spike` is supposed to go straight from Backlog to Done,
  and that rule forbids it.

The count rule survives both tests, and needs no timestamps at all — there is
nothing to be wrong about.

## Why counting gated boundaries and not stages

Counting stages breaks `chore`, whose acceptance case is a one-jump from Backlog
to Implementing. That jump crosses two *stages* but only one *gated* boundary
(`leave-preparing`), because `chore` declares no requirement at `leave-backlog`.

Checked against every shipped profile:

| Profile | Move | Gated boundaries | Verdict |
|---|---|---|---|
| feature | backlog → done | leave-backlog, leave-preparing, enter-review, enter-done = **4** | rejected — the case this ticket exists for |
| feature | preparing → implementing | leave-preparing = **1** | allowed |
| feature | implementing → review | enter-review = **1** | allowed |
| feature | review → verifying | **0** | allowed |
| feature | verifying → done | enter-done = **1** | allowed |
| chore | backlog → implementing | leave-preparing = **1** | allowed — acceptance case preserved |
| spike | backlog → done | enter-done = **1** | allowed — acceptance case preserved |

Every documented flow stays legal; only the collapse is refused.

## The error

Distinct from the existing gate failure, because the situations are opposite.
The current error means "you are missing a document". This one fires when every
document is present — refusing it with "needs X" would be a lie.

It names the next single step, so the fix is obvious:

> `GUI-005` cannot move from `backlog` to `done` in one step: that crosses 4
> document gates (leaving Backlog, leaving Preparing, entering Review, entering
> Done). Move one stage at a time; the next is `preparing`.

Backwards moves cross nothing (`boundariesCrossed` returns `[]` when `to <= from`),
so re-opening a ticket is untouched.

## `stageEntered`

An optional `Record<stageId, ISO>` on the item, stamped by `moveItem` on the way
in and never overwritten once set — first entry is the meaningful one; a ticket
bounced back to Review twice should not lose when it first got there.

It does not enable R2 and is not pretending to. It is committed history that the
gitignored activity log cannot provide, it makes time-in-stage available to the
standup view, and it means a future timing rule needs no migration.

Follows the `due`-removal precedent in reverse: schema, `KEY_ORDER`, and a
round-trip test.

## Deliberately not done

The commit-timestamp comparison (doc first-written vs. first commit on the
ticket branch) is the only thing that would catch code-then-plan. It needs the
gate engine to read git, which core does nowhere today. Recorded in the FRD-002
amendment as the open design question, not built here.
