# Gate timing — research

## My proposed R2 does not work. Two reasons, both fatal.

The ticket proposed comparing a document's **mtime** against the ticket's
**stage-entry time from the activity log**. Both halves fail on a shared board.

**The activity log is not shared.** `ensureBoardWorktree` writes
`.kanmer/data/activity.jsonl` into the board worktree's `.gitignore`
(`kanmerGit.ts:68`), and `git ls-files` confirms it is untracked. Stage history
is local to whoever happened to make the move. A teammate cloning
`kanmer-board` has an empty log, so a gate reading it would pass for me and
behave differently for them. A non-deterministic gate is worse than none.

**Git does not carry mtimes.** A fresh clone stamps every file with checkout
time, so on a colleague's machine every document looks written *after*
everything else. The gate would fire on every ticket, everywhere, once.

So R2 needs both timestamps to live in committed data, or not exist.

## Then the deeper problem: R2 cannot catch the case it was invented for

Say stage-entry times are committed to frontmatter and doc-write times too.
Take the actual cheat — write the code, then the plan, then move:

1. ticket sits in `preparing`
2. agent writes the implementation
3. agent writes `plan`
4. agent moves to `implementing`

Every timestamp is in the right order. The plan predates the move it gates. The
gate sees a perfect ticket. Nothing in the board's own data records *when the
code was written*, so no comparison between board facts can distinguish this
from doing it properly.

R2 as proposed is unimplementable, and would have been unimplementable even
with the storage fixed. I proposed it in the ticket body and it was wrong.

## What actually blocked the observed failure

The real cheat on this board was simpler than the one R2 targets:

> write all six documents, then `move_item backlog → done`, one call.

That works because `evaluateGateReport` collects **every** boundary between the
current stage and the target and checks them all against the documents present
*now*. Documents written seconds ago satisfy boundaries representing weeks of
work. The pipeline is not skipped so much as collapsed into an instant.

**One gated boundary per move** stops it dead, and needs no timestamps at all.
Reaching `done` from `backlog` becomes five moves. Each move is a separate
decision, recorded separately, and — crucially — each intervening boundary's
documents must exist *before that move*, which is exactly the ordering the
pipeline is supposed to impose.

It is a structural fix rather than a forensic one, which is why it is
trustworthy: there is no timestamp to be wrong about.

FRD-002 G2's multi-stage jump was written for convenience (`chore` skipping
straight to Implementing) and that case survives: a `chore` has **no**
requirement at `leave-backlog`, so backlog → implementing crosses one *gated*
boundary, not two. The rule has to count gated boundaries, not stages — count
stages and the chore acceptance case breaks.

## What would catch the deeper cheat, for the record

Not this ticket, but worth naming so it is not re-proposed: compare a
document's first-write time against the **first commit on the ticket's branch**.
Git commit timestamps are committed data and survive cloning, and `take_ticket`
already records the branch. A `plan` first written after the branch's first
commit demonstrably followed the code.

That needs a git read inside the gate engine, which core currently has no
business doing — `store.ts` shells out to git nowhere. It is a real design
change and belongs in the FRD-002 amendment, not smuggled in here.

## Stage-entry stamps are worth landing anyway

Even though they do not enable R2, committing `stage_entered` to frontmatter is
independently useful and cheap: time-in-stage for the standup view, cycle-time
reporting, and a durable history that does not vanish with the gitignored log.
It also makes the *next* attempt at timing rules possible without a migration.

## Decision

- **R1 (one gated boundary per move)** — implement. Structural, no timestamps,
  catches the observed failure exactly.
- **`stage_entered` in frontmatter** — implement. Durable history, useful now.
- **R2 as written** — do not implement. Record why, and the
  commit-timestamp alternative, in the FRD-002 amendment.
