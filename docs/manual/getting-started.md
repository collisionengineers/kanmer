Kanmer is a kanban board that lives in your repository as markdown files, so
you and the coding agents you work with are looking at the same thing. There is
no server and no account: the board is `.kanmer/` on disk.

## The shape of it

A **ticket** is a folder. Beside it live its documents — research, plan,
checklist, proof — each in a folder of its own, and any reference files you drop
in.

A ticket moves through six stages: **Backlog → Preparing → Implementing →
Review → Verifying → Done**. All six are columns on one board, Backlog first —
there is no second place to look. Kanmer did once give Backlog a dedicated list
view, on the argument that a long queue is something you scan rather than
something you look at all at once; keeping the same tickets in two places cost
more than the list was worth, so the list was withdrawn and Backlog came back to
the board.

## What a ticket owes

Not the same thing for every ticket. Each has a **profile** that decides which
documents each stage boundary asks for. A `feature` owes research, a plan and
proof; a `chore` owes a plan and proof; a `spike` may owe only research. Pick
the profile when you create the ticket — filing a two-line fix as a `feature`
means owing six documents nobody needs.

A move crosses **one** gated boundary at a time. If a jump is refused even
though every document exists, that is why, and the message names the next stage.

## Working with agents

Connect an agent host in **Settings → Connect**. It registers Kanmer's MCP
server for that project, so the agent can read and move tickets itself.

**Dispatch** hands a ticket to a background agent for **one deliverable** — map
the files, write the plan, run the verification — and it stops when that
deliverable exists. The menu shows what each task will produce.

## Sharing a board

In a Git repository the board lives on its own branch in `.worktrees/kanmer`, so
board changes never mix with code changes and a pull request is never noisy with
ticket edits. Turn on automatic sync in **Settings → Git**.
