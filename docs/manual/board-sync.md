Your board is files, so sharing it is a matter of getting those files onto
someone else's machine. In a Git repository Kanmer does that for you, and it
does it without putting ticket edits in front of your code reviewers.

## The board lives on its own branch

Open a Git project and Kanmer checks out a second working copy beside your
code, in `.worktrees/kanmer`, on a branch of its own. The default name for that
branch is `kanmer-board`.

Your project tab still shows your source checkout — you are not working in the
board copy and you will rarely look at it. What the separate branch buys you is
that moving eight tickets and writing four documents produces commits on
`kanmer-board`, not on your feature branch. A pull request stays a diff of the
work. The board is versioned, shared and reviewable, and it is never noise.

The worktree path does not change when you rename the branch, so nothing you
have open moves under you.

## Turning sync on

Sync is **off** until you ask for it. Open **Settings → Git** and tick
**Automatic sync**; a **Minutes** box appears, and Kanmer syncs on that interval
from then on. Ticking the box starts you at one minute, and any whole number
from one upwards is allowed — there is no fixed list to pick from.

There is a **Sync now** button for when you would rather not wait, and the hint
under it shows where the board worktree is and when it last synced.

## What a sync actually does

In order: stage the board files, commit them if anything changed, fetch, and
rebase onto the remote branch. Kanmer never force-pushes and never touches any
branch but the board's.

Rebasing rather than merging is what keeps the board's history readable — a
board that merged every two minutes would be nothing but merge commits.

## When a sync conflicts

Two people edited the same ticket and Git cannot reconcile it. Kanmer stops:
it aborts the rebase, keeps your local commits exactly as they were, and pauses
automatic sync rather than quietly retrying into the same wall.

You will see the error Git itself reported, and the **Sync now** button becomes
**Retry**. Nothing is lost while it is paused — your work is committed locally
on the board branch. Resolve the conflict the way you would resolve any other
one, in `.worktrees/kanmer`, then press **Retry**.

Sync stays paused until a sync succeeds, which is deliberate: a paused sync is
visible, and a silently failing one is not.

During a board-branch handoff, Kanmer also pauses the automatic timer while the
open worktree is on the wrong branch. It does not push using the cached branch
in the background. **Retry** re-inspects the live worktree before it can commit,
rebase, or push; if the branch is still mismatched, it remains paused and makes
no Git mutation. Once the worktree reaches the exact requested destination,
Kanmer clears only the handoff-generated pause and message; a real conflict or
push error remains visible, and **Retry** is still available.

## Renaming the board branch

For a non-protected board branch, do it from **Settings → Git**, not from the
command line. Type the new name and press **Rename branch**. Kanmer renames the
branch in place, so the board keeps its whole history and the worktree path stays
the same. It pushes the new name before any cleanup. For a custom-to-custom
rename, Kanmer cannot update the hosted repository's `KANMER_BOARD_BRANCH`
variable, so it retains the old remote ref and shows a warning. Update that
variable to the new name first; only then is it safe to delete the old ref.
The old ref is an intentional handoff record, not a failed cleanup.

The default `kanmer-board` branch is protected by the repository's merge gate.
Kanmer cannot edit GitHub protection, so it refuses to rename away from that
branch automatically. An authorized repository administrator must first push the
destination, set the repository Actions variable `KANMER_BOARD_BRANCH` to that
same destination, retarget protection and required checks to it, confirm the old
rule is removed, and rename every local `.worktrees/kanmer` worktree. The bundled
`.github/workflows/pr.yml` uses `kanmer-board` only when that variable is absent,
so update the variable before removing the old branch or protection rule. Then
change the Kanmer branch setting. Until that handoff is complete, the existing
board branch and setting are left untouched.

Projects that were closed when you renamed are migrated the next time you open
them.

## Picking the board up elsewhere

There is nothing to export. Clone the repository on the second machine, open it
in Kanmer, and the board branch is fetched into its own worktree the same way.
Turn sync on there too and the two stay level.

One thing does not travel: the activity log is local to each machine, because
it is a record of what happened in front of *you*. Tickets, documents,
reference files and board settings all sync.

## Projects that are not Git repositories

Everything still works — the board is just files in a folder. Kanmer says
so in **Settings → Git** rather than offering controls that cannot do anything,
and sharing that board is up to you.
