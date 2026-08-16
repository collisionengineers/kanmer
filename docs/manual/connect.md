Kanmer is most useful when your coding agent can read and move tickets itself,
rather than you relaying between a chat window and a board. Connecting an agent
takes one click per host.

## Doing it

Open **Settings → Connect**. You will see a row per supported host, each with a
**Connect** button:

| Host | Notes |
|---|---|
| Codex | |
| Claude Code | |
| opencode | |
| Grok CLI | |
| Antigravity | Register-only — see below |

Press **Connect** on the one you use. Two things happen: Kanmer registers this
project's board with that host's agent-tool client, and it installs Kanmer's
skills for that host so the agent knows the working practices, not just the
tools. The row reports what it wrote.

Everything is written **inside this project**. Connecting does not change your
global configuration or affect your other repositories.

## Restart the agent afterwards

Kanmer will not remind you, so remember it here: an agent that was already
running started before the registration existed and will not see it. Quit the
agent and start it again in the same project.

The same is true after Kanmer updates itself. An agent holding a connection is
running the version it started with; restart it or it keeps reading your board
with the old code.

## "Register-only"

Antigravity is marked **· register-only** in the list. It can be connected and
it can read and change the board perfectly well — but Kanmer cannot dispatch
background work to it, so it will not appear when you dispatch a task. The other
four hosts can be dispatched to.

## When it does not work

If Kanmer cannot complete the registration it says so and shows you what it was
trying to do, with a **Copy** button. For hosts driven by a command line, that
is the exact command — paste it into a terminal in your project and you are
connected. For hosts configured through a file, it names the file to edit.

Two host-specific things worth knowing:

- **Codex** only loads a project's configuration for folders you have told it to
  trust. If Codex ignores the registration, trust the folder explicitly; Kanmer
  warns you when it can tell this applies.
- **Skills are replaced, not merged.** Connecting, or pressing **Update skills**
  when Kanmer offers it, overwrites the Kanmer-owned skill folders in your
  project. If you have edited one by hand, that edit is discarded — and Kanmer
  names the folders it replaced so you can see what went.

## Keeping the skills current

When the copy of the skills in your project is older than the one your Kanmer
ships, the row shows both versions and an **Update skills** button. Nothing
breaks if you leave it; the newer skills simply describe the newer app.

## Disconnecting

**Disconnect** removes the registration for that host from this project. It does
not touch your board, your tickets, or anything outside the project.
