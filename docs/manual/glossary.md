One line each, so the rest of the manual can use a word without stopping to
define it.

**Agent** — a coding assistant you work with. Connect one and it reads and
changes your board directly, through the same files you do.

**Area** — a part of your work: the API, the GUI, the docs. Colours and clusters
cards inside each column, and supplies the prefix on ticket ids.

**Attachment** — a file you hand the work: a mockup, a log, a spec. Lives on the
ticket, readable by agents, and never satisfies a gate.

**Board** — your tickets and their settings, stored as files inside the project.

**Board branch** — in a Git project, the branch your board lives on, checked out
separately so ticket edits stay out of your code reviews.

**Boundary** — the line between two stages. What a ticket owes is attached to
boundaries, not to stages.

**Card** — a ticket as it appears on the board.

**Checklist** — the tickable distillation of a plan; one box per step.

**Dispatch** — starting a background agent on one named deliverable for one
ticket, and nothing else.

**Document** — one of the seven pieces of writing a ticket can carry: research,
files, plan, checklist, open questions, post-implementation report, proof.

**Epic** — a group meaning *these ship together*.

**Gate** — the check at a boundary. It asks whether the ticket has what its
profile says it owes, and refuses the move if not.

**Governing document** — one of your project's own product or design documents,
linked to a ticket so the work is tied to what it is meant to serve.

**Group** — a set of tickets that belong together, holding a shared goal and
shared context. Two kinds ship: epic and horizon.

**Horizon** — a group meaning *this is what matters now*. A time box rather than
a feature.

**Lease** — an agent's renewable hold on a ticket's workspace (its branch and
worktree). It expires unless renewed, so a dead agent's ticket can be taken
over — with its work kept — instead of staying taken forever.

**Batch workspace** — a deliberate exception to "one ticket, one workspace":
two or more small related tickets that share one branch, worktree and pull
request. The batch is frozen when its first member is taken, no other ticket
can join it or use its workspace, each member still gets its own review and
proof, and cleanup waits until every member is finished.

**Profile** — how much evidence a ticket owes. `fix` is the default; `chore`,
`feature`, `spike` and `custom` are the others.

**Proof** — evidence from the merged result, gathered after the change lands.
Not a description of what was built.

**Scratch** — an agent's notepad on a ticket. Working notes, not conclusions,
and never satisfies a gate.

**Stage** — one of the six fixed columns: Backlog, Preparing, Implementing,
Review, Verifying, Done.

**Sync** — pulling and pushing the board branch so a shared board stays level
across machines and people.

**Taken** — a ticket somebody or something is actively working, stamped with who
has it and which branch. Shown as a **⛏** badge on the card.

**Ticket** — a unit of work. A folder on disk, with an id, some fields, and its
documents.

**Verifying** — the stage between merged and done, where the shipped result is
checked and the proof is written.

**Worktree** — a second working copy of a repository on a different branch. Used
for the board, and by agents so parallel work does not collide.
