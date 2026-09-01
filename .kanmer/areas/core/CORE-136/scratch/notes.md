Draft `## 0.4.0` section for `apps/gui/release-notes.md` (sonnet drafter, 2026-09-01; controller to edit before commit; CORE-127 placeholder to resolve at step 3):

## 0.4.0

### Every project now carries a stable, verifiable identity

Kanmer persists a logical project and board identity in `.kanmer/project.json`, allocated once on the first write a project receives and left untouched after that. An older v0.3.12 server reads straight past the file and keeps working, so rolling back to a prior release is just deleting `project.json` — nothing else changes. Every MCP result now names the logical project it came from, and a caller can pin `expected_project` to be refused cleanly rather than writing into the wrong board. Ticket writes that matter — proofs, plans, review records — now carry a document-inclusive revision, so a stale write is rejected instead of silently overwriting newer work.

### Workspace leases replace permanent claims, and batches can share one

Taking a ticket now grants a renewable lease instead of a permanent claim: it has an identity, a revision, and a heartbeat, and it expires on its own schedule rather than staying claimed forever. Only one live writer may hold a workspace at a time (`WORKSPACE_OCCUPIED`), a renewal must name the lease it is extending (`LEASE_EXPIRED`, `REVISION_CONFLICT`), and reclaiming an abandoned lease preserves whatever dirty work was left behind rather than discarding it. On top of that, a deliberate batch lets several related tickets share one worktree and branch once their membership is declared and frozen together, while still refusing to release the workspace until every member of the batch is finished.

### Delivery targets are configurable, and delivery is tracked separately from stage

A project that develops on one branch and releases from another can now say so. Kanmer resolves the real base branch, PR target and verification target from that policy instead of assuming `main` everywhere, and the merge gate flags a pull request aimed at the wrong target. A ticket still reaches Done purely on its own evidence; whether and when it actually shipped is recorded afterwards as separate delivery state, and a hotfix's owed backport to the main line is tracked until a real commit clears it.

### Releases are serialized behind their own leases

A release channel now has exactly one active holder at a time, and every release attempt gets an immutable identity derived from the channel, the code it integrates, and its position in the sequence — so a superseded or retried attempt can never be mistaken for a later one. This lives alongside the workspace lease mechanism but in its own record, keeping release evidence informative without ever gating a ticket's path to Done.

### Quick capture lets an idea land without committing to a plan

A capture is the lightest possible ticket: a title and an observation, nothing else owed, and it never becomes a stalled or expired claim because it cannot be taken at all until someone deliberately promotes it. Promotion is a recorded decision, not a silent transition, and only from that point on does the ticket pick up the gates and expectations of whatever profile it becomes.

### Approved plans compile into bounded, executable step packets

An approved plan can now be validated and compiled into a versioned step packet naming the exact files and symbols a step may touch, what must stay unchanged, the tests and commands that prove it, and the condition that ends the step. A worker executes one step at a time against that packet rather than the whole plan at once, keeping each unit of work small and checkable.

<!-- CORE-127: constrained step reconciliation — add if merged -->

### `/goal` runs a whole scope through to Done with a bounded review budget

A durable `/goal` run now covers a single ticket, a group, an area, an explicit list, or the whole prepared board, with the roster frozen for the life of the run so later captures and additions never join in flight. Each review round draws down a bounded remediation budget, and a ticket that exhausts it stays blocked rather than looping through automatic replans forever (`REMEDIATION_BUDGET_EXHAUSTED`). Review scope narrows to only what changed since the last round, and verification re-confirms a pass against the exact merged code rather than trusting an earlier result.

### Stuck tickets can be inspected and, now, actually fixed

`reconcile_ticket` reports what is really true about a ticket stuck in Review or Verifying — board state, claim state, proof, and the pull request itself — without touching anything. `apply_reconciliation` is the new companion that can act on that same fresh evidence: routing a verified failure back to the right stage, recovering a workspace whose claim expired, or moving a ticket forward, all bound to the ticket's current revision so a decision made against stale evidence is refused.

### Multiple projects show up in one place

A named endpoint registry at `~/.kanmer/endpoints.json` lets a single MCP client see every project it knows about — identity, location, health, sync state, and who is actively working where — without ever mixing writes across projects. The GUI's new Settings tab gives that same registry a face: add, open, or check the health of any registered project from one screen.

### The merge gate can be made strict, and board sync is confirmed rather than assumed

Checks that were previously advisory — an unreviewed merge, a stale review, an out-of-sync board — can now be turned into hard failures with `KANMER_GATE_STRICT`. A pull request whose recorded board state has diverged from the real board tip is caught as `SYNC_REQUIRED`, and a review that no longer matches the current commit is caught as `STALE_REVIEW`, both before a merge rather than after.

### Windows verification is reliable again

A cluster of intermittent Windows test failures — teardown races on locked files, timeouts sized for a quiet machine rather than a loaded one, and a lock held far shorter than the work it protected — is fixed at the root cause rather than retried around. `npm run verify` on Windows no longer needs a retained failing attempt explained away.

**Upgrading from 0.3.x:** boards written by this release stay fully readable by a v0.3.12 server; `project.json` and every lease field are additive and ignored by older code, so there is no board migration prompt to expect. After updating, re-run `kanmer-setup` to refresh AGENTS.md and your installed skills.
