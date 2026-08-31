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

**Integration branch** — the branch a project's ordinary pull requests target
and its ordinary verification proves. Most projects use `main`, which is what
Kanmer assumes when a project says nothing; a project that develops on `dev` and
releases from `main` declares that instead, and every worker then gets the right
base branch, pull-request target and verification target without being told.

**Delivery state** — how far a change has actually travelled: not integrated,
integrated into a branch at an exact commit, included in a release candidate,
released under a branch and tag, deployed, production verified. It is recorded
separately from the workflow stage on purpose. A ticket is Done when it has been
accepted against its integration target — it does not sit waiting for the next
production release — and its inclusion in that release is recorded here
afterwards. Delivery state never opens a gate: recording a release can never
stand in for proof.

**Lease** — an agent's renewable hold on a ticket's workspace (its branch and
worktree). It expires unless renewed, so a dead agent's ticket can be taken
over — with its work kept — instead of staying taken forever.

**Release channel** — a named stream a project releases on, usually its release
branch. Exactly one release owns a channel at a time, held by a renewable lease
that behaves like a ticket's: it expires unless renewed, and an expired one is
reclaimed rather than quietly taken. Names are normalized for Windows, corrupt
ownership fails closed, and a short-lived journal finishes an interrupted
multi-file update before another owner can act. A second owner is refused.

**Release attempt** — the durable record of one release on a channel: which
commit it was cut from, its candidate identity, the branch and tag it produced,
the pull requests and tickets it includes, its artifacts and its verification
state. Its identity can never be edited, and a finished attempt is frozen — so a
failed release keeps its exact evidence instead of being tidied away. The record
also binds the delivery-policy version used when its integration commit was
resolved; a policy change during collection refuses the mint.

**Candidate identity** — the name a release attempt gives the exact commit it is
releasing. It is derived from that commit, so remediating at a different commit
necessarily produces a *different* candidate — which is what stops evidence
gathered for the first one from being read as evidence for the second. A release
that finishes clears its channel; one that is replaced records its causal
predecessor/successor rather than relying on wall-clock timestamps.

**Batch workspace** — a deliberate exception to "one ticket, one workspace":
two or more small related tickets that share one branch, worktree and pull
request. Its first take records the complete roster in a hash-bound manifest:
`pending` can roll an interrupted declaration forward, `active` protects that
immutable roster, and `releasing` makes cleanup resumable. That declaration
must name a real shared worktree; a missing or blank path is refused before the
manifest or any ticket is written, while an isolated ticket may still record
only a branch. Work authority is
the exact pair of the actual MCP actor and a nonempty durable controller-run id
that survives reconnects; every declaration, recovery, member take, heartbeat
and execution packet must match both. A modern batch heartbeat also names its
current lease id and revision. Supplied owner labels cannot take the batch over.
For an automated goal, the automation ledger's immutable run id is that
controller-run id; worker, session and reconnect identities never replace it.
Before an untaken sibling acquires its own lease, its packet keeps it truthfully
untaken while exposing the manifest branch and portable worktree in the ticket,
claim and compiled-step workspace fields; the sibling takes that existing
location rather than creating another worktree.
The manifest records its worktree relative to the repository plus the branch,
so a copied or relocated checkout retains the same authority; absolute paths
are only local collision evidence. Dependencies between exact roster members
order work within the shared pull request, while external or dangling blockers
still block it.
While the manifest remains active or releasing, listings show its state,
complete roster, workspace and branch even if ticket-local fields have already
been cleared. The first member alone creates the shared pull request with every
roster footer. Later members push the same branch, require exactly one open
pull request with the right repository, base, head and roster, and record that
same request on their own ticket; they never create another. Every member must
have actually taken the shared workspace and keep an independent-pass
exact-head review bound to its current ticket timestamp and plan version. Once
the shared request merges, review advances the complete roster from Review to
Verifying in manifest order, safely skipping members already advanced by an
interrupted attempt and stopping on any other state. Each member then keeps its
own merged proof, and only after every member is terminal may any fresh
closeout agent complete the actor-neutral release and remove the shared
worktree and branch.

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
