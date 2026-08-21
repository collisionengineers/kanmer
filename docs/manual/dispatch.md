A connected agent can work your board while you talk to it. **Dispatch** is the
other direction: you point Kanmer at a ticket, choose one job, and it starts a
background agent to do that job and nothing else.

## Choosing a model and adding operator instructions

Open **Settings → Dispatch** to configure background dispatch on this machine.
Each dispatchable provider has a default model, optional per-task override, and
an optional suffix of additional instructions. The task's built-in prompt is
always retained; the suffix is appended and cannot replace the ticket workflow.
Leave the model blank to use the provider CLI default. Model names are opaque,
limited to 200 characters, and are not checked against a catalogue. The suffix
is limited to 4,000 characters. These settings are stored as plaintext in your
Electron user data, so never enter credentials or secrets.

If a provider is not shown, Kanmer does not support starting it in the
background. A failed configured model is reported as a failed dispatch; Kanmer
does not retry without the model. Live provider authentication and model
availability remain host-specific.

## Doing it

Right-click a card → **Dispatch to agent** → pick the agent → pick the task.

Four hosts can be dispatched to: Codex, Claude Code, opencode and Grok CLI.
Antigravity can be connected but not dispatched to, so it does not appear here.

## One deliverable, not "work on this"

The task menu is deliberately narrow. Each entry names what it will produce, and
the agent stops when that thing exists:

| Task | Produces |
|---|---|
| **Research (quick)** | At least one research document |
| **Deep research** | Several research documents plus a summary |
| **Map files** | At least one files document |
| **Write plan + checklist** | A plan and a checklist |
| **Execute checklist** | The checklist worked through, a post-implementation report, and a pull request open |
| **Verify + write proof** | At least one proof document |

There is also **Whole ticket**, which hands the agent the ticket and lets it use
its own judgement. It is the right choice less often than it looks: a background
agent with an unbounded goal is a background agent you have to supervise, and
the entire benefit of dispatch is not having to.

A narrow task has a done-condition you can check in three seconds. That is what
makes it safe to walk away from.

## What the menu tells you before you commit

Two entries turn themselves off when they cannot work:

- **Execute checklist** is disabled with no plan — *"no plan yet — dispatch
  Write plan + checklist first"*.
- **Verify + write proof** is disabled until something has merged — *"nothing is
  merged yet — verify runs on merged main"*.

Others stay available but warn: dispatching a plan with no research says the
plan will be less grounded; deep research on a ticket that already has research
says it will add to it rather than start over. The warning is advice, not a
refusal — sometimes you know something the board does not.

## Watching it

A card with a dispatch in flight shows an **⏳ agent** chip.

For the detail, open the command palette and choose **Show background
dispatches**. The drawer lists this session's dispatches — the ticket, the
state, which agent, which task, and the last few lines of output. **Cancel**
stops one.

You get a toast when a dispatch finishes, whichever way it finished: done,
failed, cancelled, or timed out. Dispatches time out after thirty minutes, on
the grounds that an agent still going after half an hour on one deliverable is
stuck rather than thorough.

When a dispatch ends, a summary — how it exited, how long it took, and the tail
of its output — is appended to the ticket's scratch notes, so the record
outlives the session.

## One at a time, and not on a taken ticket

Kanmer will not start a second dispatch on a ticket that already has one
running, and it will not dispatch a ticket that somebody has taken. Release it
first. Both rules exist to stop two agents writing the same document.

## Taken tickets and worktrees

An agent doing real work takes the ticket first: that stamps it with who has it
and which branch the work is on, and moves it to Implementing. The card shows a
**⛏** badge with the branch name, so the board tells you what is live.

Agents doing implementation work in their own git worktree, one per ticket, is
the working practice Kanmer's skills follow — it is how parallel work avoids
colliding. Dispatch itself does not create the worktree; the agent does, as part
of the execute task.

You can take and release a ticket yourself from the command palette.

## What your agent will say it is doing

If you dispatch to an agent that has Kanmer's skills installed, its output will
name them: `kanmer-research`, `kanmer-plan`, `kanmer-execute`, `kanmer-review`,
`kanmer-verify`, `kanmer-closeout`, and a few more for board housekeeping.

They are the working practices behind the stages in this manual — one per job.
You do not need to learn them; they are listed here only so that seeing
`kanmer-plan` scroll past reads as *"it is writing the plan"* rather than as
something going wrong.

## Remote MCP dispatch is opt-in

The MCP server exposes the same bounded contract as three tools:
`dispatch_task`, `list_dispatches`, and `cancel_dispatch`. It is **disabled by
default**. An operator who deliberately wants a host to launch local agents
must configure all of the following in its process environment:

```text
KANMER_DISPATCH_ENABLED=true
KANMER_DISPATCH_PROVIDERS=codex,claude
KANMER_DISPATCH_TASKS=research-quick,files
KANMER_DISPATCH_MAX_ACTIVE=1
KANMER_DISPATCH_TIMEOUT_MS=1800000
KANMER_DISPATCH_APPROVAL=elicit
```

Provider and task ids are closed allowlists from Kanmer's core registry. The
caller cannot provide a command, prompt, working directory, environment, pid,
or log path. The server checks the project fingerprint, ticket state,
feasibility, duplicate/concurrency limits and approval before it creates a
child or local log. `elicit` refuses when the host cannot complete approval;
`preapproved` is an explicit operator decision, not a fallback. Bearer-token
authentication proves access to an endpoint but does not authorize process
launch.

Remote list/cancel responses contain only sanitized lifecycle metadata. Raw
output and local log paths remain on the host; one bounded terminal summary is
written to ticket scratch, and a scratch failure remains visible as
`recordingError`. Credentials or a live provider/remote host are not implied by
these repository checks.
