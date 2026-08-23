Things that go wrong, and what they mean.

## A move is refused

That has its own chapter, because it is the most common thing to be stuck on and
there are exactly two causes. See **Why can't I move this?**

## An attachment does not satisfy a gate

It never will, by design. See **Reference files and scratch**.

## The board is empty

Check you opened the project you meant to — the one containing the board. Kanmer
remembers recent projects, and it is easy to reopen a neighbour.

If the project is new, an empty board is correct: the board's folder is created
the first time something is written to it. Make a ticket and it appears.

If the project is a Git repository and the board was working yesterday, look at
**Settings → Git**. The board lives on its own branch in a separate working copy
and Kanmer finds it for you, but if something has happened to that branch —
deleted locally, renamed outside the app — that tab is where it will say so.

## A ticket will not open

Almost always a file that was edited outside Kanmer and is no longer valid — a
broken frontmatter block at the top of the ticket's markdown file, usually a
stray quote or a bad indent. Open the file and look at the block between the
`---` lines.

## An agent cannot see the board

In order of likelihood:

1. **The agent was already running when you connected it.** It started before
   the registration existed. Quit it and start it again in the same project.
2. **It was never connected for this project.** Registration is per project.
   **Settings → Connect**, press Connect on your host.
3. **Kanmer updated while the agent was running.** An update closes agent
   connections deliberately — see **Keeping Kanmer up to date** — and the agent
   does not reconnect by itself. Restart it.
4. **You are using Codex and have not trusted the folder.** Codex only reads a
   project's configuration for folders you have trusted. Kanmer warns you about
   this when it can tell.

## An agent is working on the wrong project

Registration is per project and so is the board it points at. If you have
several projects open, check the agent was started in the folder you think it
was — an agent's connection follows the directory it launched in, not the tab
you are looking at.

## Automatic sync is not syncing

**Settings → Git**: sync is off until you tick **Automatic sync**, so a board
that has never synced usually just has not been asked to.

If it *was* syncing and stopped, look for an error on that tab and a **Retry**
button where **Sync now** used to be. That means a sync hit a conflict and
paused. Nothing is lost — your work is committed on the board branch — but it
will stay paused until you resolve the conflict and retry. See **Sharing a board
over Git**.

If the board branch is being handed off, the timer also stays stopped while the
open worktree is on the wrong branch. Kanmer never uses the cached branch for an
automatic push; after the exact destination is observed, only the generated
handoff pause is cleared. A genuine sync error remains, with **Retry** available.

## Two people edited the same thing

Kanmer tells you rather than picking a winner.

On a document you get **Reload from disk** or **Overwrite anyway**; your typed
text survives either way, so reload, look at what arrived, and re-apply your
change if it still applies.

On the ticket's fields you get **Keep mine** or **Take theirs**, and only the
fields that actually collided are in question — an agent moving a ticket while
you retitle it is not a conflict at all.

## Renaming the board branch

For a non-protected branch, do it from **Settings → Git**, not from the command
line. Renaming there keeps the board's history and its working copy, and pushes
the new name before any cleanup. A custom-to-custom rename retains the old
remote ref and warns you to update the hosted `KANMER_BOARD_BRANCH` variable
first; delete the old ref only after that variable points at the new branch.
This retained-ref rule applies to every custom-to-custom rename. If Settings
shows a board worktree together with an error while Git is marked unavailable,
the project is a failed reconciliation, not a non-Git project: complete the
handoff and press **Retry**.
For the protected default, Kanmer deliberately refuses this automatic rename.
An administrator must push the destination, set the repository Actions variable
`KANMER_BOARD_BRANCH` to the destination, retarget protection and required
checks, remove the old rule, and rename each local board worktree. Only after
that handoff is complete should the Kanmer setting be changed; closed projects
reconcile when they next open against the exact destination.

## I cannot find the setting for stages, or priorities

Neither exists. The six stages are the same on every board and cannot be
changed; priority was removed. **Settings, tab by tab** has a short list of the
other things people go looking for and do not find.

## An update will not install

If Kanmer cannot confirm that connected agents have disconnected, it refuses to
install rather than risk replacing itself while part of it is in use. Close your
agents and quit Kanmer; the download is kept and it will install then.

## Something else

The board is files. If Kanmer is confusing you about what state something is in,
open the ticket's folder and read it — that is the actual truth, and there is no
hidden state anywhere else.
