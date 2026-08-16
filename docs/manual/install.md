Kanmer is a desktop application. There is no account to make, no server to
point it at, and nothing to configure before it is useful.

## Installing

Download the installer from Kanmer's releases page and run it.

The installer is not code-signed, so Windows SmartScreen will warn you the first
time. Choose **More info → Run anyway**. You pay that once: updates after the
first install are downloaded and applied by Kanmer itself and do not trigger the
warning again.

It installs for your user rather than for the whole machine, so it does not ask
for administrator rights, and you can choose the location if you want to.

## Opening a project

Kanmer works on a folder. **File → Open project folder…**, and pick the root of
the project you want a board for — the same folder you would open in an editor.

You can have several projects open at once; each gets a tab across the top.
Kanmer remembers what you had open and reopens it next time, and keeps a list of
recent projects.

## Where the board lives

Your board is a folder called `.kanmer` inside the project. Tickets, their
documents, your areas and your board settings are all files in there — readable,
diffable, greppable, and yours.

If the project is a Git repository, there is one wrinkle worth knowing about
immediately: the board is kept on its own branch, in a second working copy at
`.worktrees/kanmer`, so that ticket edits never show up in your code reviews.
Kanmer sets that up and finds it for you. See **Sharing a board over Git**.

If it is not a Git repository, `.kanmer` sits directly in the project folder and
everything else works the same.

## The first time

An empty board is not much to look at, so the fastest way to understand Kanmer
is to put something on it. **Your first ticket, end to end** walks through
exactly that.

Two things are worth doing early:

- **Set up your areas** in **Settings → Board**. An area is a part of your work,
  it colours and clusters your cards, and it decides the prefix on ticket ids.
  A board ships with one; three or four is usually right.
- **Connect an agent** in **Settings → Connect**, if you work with one. See
  **Connect an agent**.

## A note on when `.kanmer` appears

The folder is created when the board is first written to — when you create your
first ticket, or when you change a board setting. Opening a project and looking
around does not create anything, so pointing Kanmer at a folder to see what is
in it leaves no trace.
