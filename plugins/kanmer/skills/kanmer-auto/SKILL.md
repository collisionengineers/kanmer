---
name: kanmer-auto
description: Run a durable goal controller over a frozen roster — one ticket, one explicit Kanmer group, one area, an explicit ticket list, or the prepared board — keeping a resumable run record on the host group while driving each roster ticket through its profile pipeline with independent review and exact-merge verification. Use for /goal, or when the user says "clear HZN-003", "work through 0.3.3", or "finish this epic". DO NOT USE FOR one phase of one ticket — use the phase skills directly.
---

# Driving a goal run autonomously

`kanmer-auto` is orchestration, not a new workflow. Each ticket still follows
the phase skills' procedures exactly as written; this skill freezes the roster,
orders safe work, reconciles every result against live state, and controls how
many lanes run at once. The controller never turns a worker message into board
evidence, and never becomes the reviewer or the verifier of work it dispatched.

## Orientation, scope and durable-state resume

A `/goal` run drives one **frozen roster** through the phase skills. It accepts
five scopes: one ticket, one explicit existing group, one area, an explicit
ticket list, or the prepared board. A group scope is the ordinary case and needs
nothing further.

Every other scope has no durable batch owner of its own, so it names a **run
host group** whose `automation/` folder owns the record: stop before mutation
and ask the operator to name or create an epic/horizon to host the run. The host
group's membership is **not** the roster. The roster is the ordered list frozen
in the run record's `## Selection contract`, resolved once at run creation from
the scope and never re-resolved. A ticket created after that freeze never joins
a running roster, whatever its group, area or `blocks` edge, and neither does a
quick capture (an item whose profile is `capture`, FRD-032): a capture enters
goal selection only after an explicit promotion, and only in a later run. Do not
add MCP tools, ticket fields, entities, leases, hidden local state, or automatic
merging.

Several controllers may run against one board at once when their scopes and
their workspaces are disjoint. A controller owns the roster it froze and the
workspaces it leased — never the project, and never a ticket merely because the
ticket exists on the board.

At startup, before any ticket write or dispatch, read `get_status`, `get_group`,
the group's `context.md`, and `automation/current.md`. A current record with
status `running`, `paused`, or `blocked` is resumed and reconciled; it is not
silently replaced. Validate its schema, group, project fingerprint, controller
ownership, and referenced history path. A different controller owning a
`running` record is a stop predicate.

### Preflight before the first mutation

Before the roster is frozen, and before any ticket write or dispatch:

- **Identity.** `get_status.project.fingerprint` must equal the run record's
  `project_fingerprint`. A mismatch is a stop, not a value to overwrite. Send
  the fingerprint as `expected_project` on writes when `compat.expectedProject`
  is advertised as optional.
- **Repo staleness.** Report every `get_status.repo.stale` entry. A `behind`
  artefact is an operator action through `kanmer-setup`; it is never a repair
  this controller performs in the middle of a run.
- **Delivery target.** Read the project's delivery policy once and record the
  resolved **PR target** and **verification target** in the run record. A
  controller never hardcodes `main`: the branch a ticket's PR aims at, and the
  branch whose merged SHA is verified, come from that policy and from each
  ticket's own execution packet. A project that declares no policy resolves to
  main-only, which is a resolved answer rather than an absent one — and is
  exactly why a hardcoded `main` looks correct on such a board and is still
  wrong on the next one.
- **Board worktree.** `get_status.boardWorktree` must be healthy and on its
  board branch. `.worktrees/kanmer` is that board worktree: never a lane, a
  rebase target, a cleanup target, or a working directory.
- **Capability.** Whatever the run intends to dispatch must exist now —
  subagent dispatch, the GitHub CLI, the packet tools. An unavailable required
  capability is a stop before dispatch, not a failed lane after it.

Durable state belongs in the group's documents, never in a ticket:

- Current-run pointer: `automation/current.md`
- Immutable run history: `automation/runs/<run-id>.md`

For a new run, create a path-safe unique UTC id (adding a numeric suffix on
collision), fill `assets/run-state-template.md`, and keep its required
frontmatter (`kind`, `schema`, `run_id`, `group`, `project_fingerprint`,
`controller`, `status`, `created_at`, `updated_at`, `lane_limit`,
`stop_reason`) and headings (Selection contract, Run invariants, Ticket ledger,
Event log, Resume instruction). Run status is exactly `running`, `paused`,
`blocked`, `completed`, or `aborted`; ticket dispositions are exactly `queued`,
`active`, `waiting`, `blocked`, `finished`, or `skipped`.

Write and read it back: the complete history record before writing
`automation/current.md`; write and read back the pointer before dispatch. Never
overwrite an old history record. Update and read back both documents around
every assignment, worker result, reconciliation, wait, pause, block,
completion, or abort. Store operational state only: roster, target, lane
partition, skip reasons, worker outcomes, and concise operator answers. Never
store secrets, full prompts, or large command output.

## 1. Roster and gates-first readiness

1. Call `get_status`, then `list_items group: "<explicit group>"`; use the
   group's order and show the resolved roster, target point, and exclusions to
   the operator before starting. `list_items`, not `get_group`, supplies the
   taken, blocked, and profile fields needed for selection.
2. Read the group's shared context. Drop archived or blocked tickets, and drop
   **quick captures** — a summary with `capture: true` (profile `capture`) is a
   recorded observation, not selected work, and promoting one is an operator
   decision this skill never makes. Report them in the exclusions rather than
   silently omitting them; the server refuses to move, take or packet one
   (`CAPTURE_NOT_PROMOTED`), so a capture that reaches selection is a bug in the
   roster, not a ticket to unblock. A ticket
   taken by another actor is handled by its claim state, never by `force`:
   - a **live** foreign claim (`claim_expires_at` in the future, or a
     pause/resume note in its scratch) belongs to that actor — drop it and
     coordinate;
   - an **expired** foreign claim (`get_execution_packet` refuses with the
     claim expired, or `claim_expires_at` has passed with no live run record)
     is transferred, not stopped on: first `append_scratch` a note naming the
     old controller, this controller, the recorded branch and worktree, then
     `take_ticket action: "transfer"`. Transfer keeps the branch, worktree and
     uncommitted work; a `CLAIM_LIVE` refusal means the claim was renewed
     meanwhile — treat it as live. Never pass `force`, and never `release` a
     claim that still has a worktree.
3. Parse the requested target: “up to review” stops each ticket after its PR is
   open and its ticket is in Review; the default is closeout, subject to the
   human merge boundary. Resolve stage names with `list_board`.
4. For every retained ticket, call `get_doc_gates` and use its current stage,
   reachable stages, and first unmet next-boundary requirement as the routing
   table. Do not restate profile-to-document mappings in this skill.
5. Advance one gated boundary per move. Set `docs_todo` only when a governing
   document genuinely needs to be written; do not create optional documents to
   normalize the roster. A ticket with no currently required preparation phase
   routes to its next applicable action.
6. A user-only question at any phase parks that ticket as `waiting`, quotes the
   question and recommendation in the event log, and pauses that lane. Never
   guess an operator answer.

## 2. Lane assignment

Compare every retained ticket's `files` document. Disjoint file sets may use
different lanes; overlapping files share one serial lane; a `blocks` edge orders
the blocker before its dependent regardless of file disjointness. Cap parallel
work at approximately three lanes.

Files are not the only overlap. Two tickets also share one serial lane when they
touch the same **contract or API surface** — the same exported type, tool name
or schema — the same **migration** sequence, the same **lockfile** or dependency
manifest, or the same **heavyweight shared resource**: a release channel, a
device, a fixed port, or the single hosted CI rail. Resource overlap is real
even when the diffs are disjoint, and it is not free to ignore: two heavy
verification rails running at once is a documented cause of host timing
failures, so hold the second rail rather than reading its flake as a regression.

Before assigning a ticket, re-read its item, links/dependencies, taken state,
required document versions, activity, and `get_doc_gates`. Record the lane as
`active` with worker, branch/worktree when known, attempt, timestamp, action,
and stop condition; append a `lane-assigned` event; write/read back the full
run record; only then dispatch.

Each lane uses its own `.worktrees/<id>` worktree and branch. The one
exception is a deliberate batch lane (FRD-030): two or more small related
tickets the run record names as one batch share one worktree, branch and PR,
declared and frozen by the first member's `take_ticket` with `batch` and
`batch_members`; the lane is not cleared until every member is terminal, and
no other ticket may join it or take its workspace. No lane may touch
`.worktrees/kanmer`, which is the board worktree on the board branch and is
never a lane, rebase target, or cleanup target. A ticket runs through the
existing phase skills only: `kanmer-research` → `kanmer-plan` →
`kanmer-execute` → independent `kanmer-review` → `kanmer-verify` →
`kanmer-closeout`, only as far as the requested target permits.

## 3. Controller action loop and result reconciliation

The controller chooses one safe next action per ready lane. The worker receives
the execution packet/approved plan, exact role and allowed scope, and its
mandatory Stop condition. The worker returns at that Stop condition or a
mandatory stop predicate; it never chooses another ticket or dispatches a
successor. Workers renew their own lease (`take_ticket action: "renew"` with
the packet's `claim.leaseId` / `claim.leaseRevision`) on resume, at least every
`claim.heartbeatMinutes`, and before long commands (`phase: "running-command"`
with a bounded `extend_minutes`); a `LEASE_EXPIRED` refusal means the lease was
reclaimed and the worker stops; a subagent worker that backgrounds a command
reads that command's log itself before returning — it is not notified while
stopped, and a worker that ends its turn "waiting for a notification" is a
failed worker, reconciled from live state like any other.

On every result or timeout, the controller:

1. stops conflicting dispatch while the result is uncertain;
2. re-reads the live item, links/dependencies, documents and versions, activity,
   Git/PR state where applicable, and `get_doc_gates`;
3. compares actual mutations, stage, gate, checklist, branch/worktree, commit,
   PR and error evidence with the approved scope;
4. records the worker result, reconciliation, discrepancy, and one next action
   in the ledger/event log; and
5. writes and reads back the run record before selecting another action.

After anything merges to `main`, lanes still in flight rebase before opening a
PR (`git fetch origin && git rebase origin/main`). A failed ticket does not
silently disappear: record the exact failure, release it only under the phase
skill's rules, return it to the appropriate stage, and classify it in the run.

Two results are routed rather than stopped on:

- A **`needs-changes` review** on a lane's PR. The reviewer (or this
  controller) moves the ticket `review` → `implementing` with a reason, as
  `kanmer-review`'s sanctioned return describes; the next action for that lane
  is `kanmer-execute` on the **same** branch, worktree and PR (its re-entry
  lane), followed by the reviewer's delta review. Read `review_round` and
  `remediation_budget` from the item before dispatching: a
  `REMEDIATION_BUDGET_EXHAUSTED` refusal is an operator-only question, quoted
  verbatim, never a retry.
- A **non-PASS verification** with a `failure_class`. Route by
  `kanmer-verify`'s table — `transient` reruns in Verifying, `inconclusive`
  waits with the missing check named, `implementation` returns the ticket to
  Implementing, `plan` returns it to Preparing — each by one `move_item` with
  a reason quoting the proof. A proof without a class is `inconclusive` until
  the verifier classifies it.

### Push the board before trusting a gate

The merge gate reads the **remote** board tip, and it does not re-run when the
board is pushed. A gate result is therefore evidence only about a board the
remote has already seen. Before treating one as current, confirm the board
branch is pushed, from a normal checkout and with absolute paths:

```sh
git -C <absolute-path-to-board-worktree> rev-parse kanmer-board
git -C <absolute-repository-root> rev-parse origin/kanmer-board
```

The two must be equal. On a server that reports it, `get_status.boardSync` with
`ahead` at 0 and a matching local SHA is the same fact; older servers do not
expose it, so the git comparison is the portable form and the one to state in a
hand-off. A gate that passes while recording that no review attestation exists,
or that fails with `SYNC_REQUIRED`, is a stale-board artefact and not a verdict
about the work: get the board synced — the operator pushes it unless they have
explicitly granted this run that authority — then re-run the failed job at the
same SHA and read the result again. Never manufacture the missing evidence, and
never commit or push the board branch outside an explicit grant.

### Read the evidence, not its summary

- Read a proof or a review attestation **in full**, never frontmatter-only. The
  frontmatter carries the only machine-readable verdict, and prose appended
  later can contradict it; a frontmatter-only read is a recorded cause of a
  wrong disposition.
- A `threads_snapshot` is a YAML **array**, one entry per thread. A mapping is
  an invalid attestation even where the gate downgrades it to a warning.
- Every controller git command uses an **absolute path**. A shell whose working
  directory had drifted into the board worktree once ran a merge there; git
  refused it, but the guard is the absolute path, not the luck.
- Concurrent verifiers get distinct log paths. Two verifiers sharing one log
  file destroy each other's evidence.
- Never run a secrets-manager listing command to inventory names, and never
  rely on a post-hoc text filter to redact output that has already been
  produced.
- A reviewer finding dispositioned minor, note or accepted-risk does not become
  a new ticket: filing one un-accepts the risk that was just accepted. A new
  ticket needs a blocker or major finding, or one that blocks a named governing
  acceptance criterion. Everything else stays recorded as residual risk on the
  ticket that owns it, and a roster that grows faster than it clears is the
  failure this prevents.

### Bounded churn and the escalation boundary

A ticket gets one consolidated review, one in-scope remediation batch, and one
delta review. `kanmer-review` owns those rules and this skill does not restate
them; what the controller owns is the route out when they are spent.

- The delta review still blocks, and the blocking finding is a **plan** defect —
  the implementation does what the plan said and the plan is what is wrong. The
  controller may take **one automatic replan** for that ticket: one `move_item`
  to `preparing` with a reason quoting the finding ids, one fresh planning
  subagent, one plan revision, then re-execute on the same ticket. Record it
  once in the ledger's replan column. It does not raise `remediation_budget`.
- `move_item` refuses `REMEDIATION_BUDGET_EXHAUSTED`. The budget is genuinely
  spent. That lane goes `blocked` with the refusal quoted verbatim while the run
  continues other safe lanes. The controller **never** routes `review` →
  `preparing` to get around that refusal — the store guards one boundary and
  routing around it through another is the same bypass. Only an operator
  re-opens the loop, with a reason beginning `operator:`, which also raises the
  budget.
- The replan is bounded too. A ticket that still fails materially after its one
  replan stops as an explicit `blocked` outcome carrying the exact evidence. It
  is not retried again, and the same work does not reappear as a fresh ticket.

### Active Review and Verifying invariants

A selected ticket in **Review** must have an open PR, a current head SHA, an
active or immediately queued reviewer, and an attestation state. A selected
ticket in **Verifying** must have a confirmed merged PR, an exact merge SHA, an
active or immediately queued verification attempt, and a known proof state.

Anything else is an unexplained state, and it is reconciled before the run
reports anything: a merged PR still sitting in Review is moved on through its
own gates, and a PASS proof still sitting in Verifying is moved and closed out.
Verifying is not a holding column. The run is never reported as `completed`
while a selected ticket sits in an unexplained Review or Verifying state, and a
standup summary of the rest of the roster does not substitute for that.

## 4. Mandatory stop predicates

These predicates stop or pause dispatch; none may be reported as successful
completion merely because a partial roster has a standup summary:

1. wrong project fingerprint or required capability;
2. unhealthy or unknown board worktree for the required action;
3. durable run-state write/readback failure;
4. an unresolved non-parked question;
5. a missing required governing or pipeline document;
6. a materially stale approved plan or document version;
7. a live dependency;
8. a ticket occupied by another actor's live claim (an expired claim is
   transferred, not stopped on);
9. a branch/worktree mismatch or unsafe path;
10. worker-reported plan deviation, ambiguity, destructive risk, security or
    secret risk;
11. a required command or environment unavailable;
12. a failed test or verification;
13. unknown PR, check, or merge state;
14. the plan's explicit `## Stop condition`;
15. an operator target, time, budget, or cancellation boundary;
16. no safe ready work; or
17. true run completion.

The only successful terminal stop is an exhausted roster at the declared
target. The only operator-wait stop is a genuine operator-only question. A
partial-roster report presented as success is a defect; safety predicates use
`paused`, `blocked`, or `aborted` with their exact reason instead.

A failed verification first stops the lane as retryable; auto never infers that
it is terminal. If the operator explicitly declares the result irrecoverable or
superseded and supplies the reason plus a successor ticket or an explicit
no-successor disposition, resume through `kanmer-verify`'s terminal-retirement
path and then `kanmer-closeout`. The archived Verifying ticket is reported as
skipped/retired non-success, never cleared or Done. Without that disposition,
the lane remains stopped with the exact failed check and resume action.

## 5. Persisted stop/hand-off format

Before an intentional safe stop, set the accurate run status and `stop_reason`.
Record the exact predicate text/id, affected tickets, observed stage/gates and
document versions, worker/attempt, commands and evidence, remaining roster,
and one deterministic resume read/action. Append the stop event. Write/read
back the complete history record first, then write/read back the pointer. If
state persistence fails, report that failure and never claim a durable
hand-off. A user-only question is quoted rather than collapsed into “blocked”.

## 6. Serial fallback — `lane_limit: 1`

If parallel worker dispatch is unavailable before a worker starts, persist
`lane_limit: 1` and a `parallel-unavailable` event/reason, then use the same
ordered roster, gates-first readiness, controller loop, durable state cadence,
per-ticket take/worktree/packet rules, and stop predicates. Subagents matter
because fresh worker contexts keep a long controller run small enough to finish;
without them the run may span invocations, and the persisted state makes that
span resumable rather than a new or duplicated run.

Serial mode permits only one active or uncertain ticket. It does not pre-take
future tickets, broaden scope, combine tickets, or skip reconciliation. Finish
and persist the current action before assigning the next ticket. If the
controller safely adopts a designated preparation or execution role, it says
so explicitly and obeys that phase skill, then returns to controller mode at
the role's Stop condition.

## 7. Role-independence boundaries

Serial execution is not permission for one context to impersonate every role.
Implementation never self-reviews; independent review and post-merge
verification remain separate actor/context requirements. If the required
reviewer or verifier is unavailable, stop at that boundary with the exact
handoff, and do not waive merge-SHA proof, required checks, or live evidence.
The controller never runs `gh pr merge` and never treats a passing PR as
merged.

Independence is a distinct **run identity**, not a distinct account: the
implementation run's identity must differ from the reviewer's, and the verifier
is a third. Record all three in the ledger, so an attestation that says it is
independent can be checked against the run rather than believed.

The controller **coordinates** the merge; it does not perform it. It dispatches
the independent reviewer that holds the merge point, and reconciles the merge
from GitHub afterwards. Handing a blocked merge back to the reviewer that
withheld it is the correct move, not an escalation — that reviewer is the actor
whose condition has to be satisfied.

Branch protection that sets `required_conversation_resolution` holds a PR at a
blocked merge state until every review thread is resolved, however green its
checks and whatever its approval count. Dispositioning a finding in the
attestation and resolving its thread on the PR are **one obligation**, owed by
the reviewer that dispositioned it, and discharged in that order so the record
survives outside the board. A reviewer that does the first without the second
leaves a PR that cannot merge; reconcile that as an unmet review obligation, not
as a merge failure, and never as a reason for the controller to merge instead.

## 8. Completion definition

Worker completion means return at its assigned Stop condition, not ticket
completion. A ticket reaches its lane target only with live Kanmer stage,
documents, gates and Git/PR/proof evidence. The run is `completed` only when
every selected non-skipped ticket reaches the declared target and no lane is
active or waiting. Waiting, blocked, skipped, and failed reasons remain visible;
worker final text, checklist prose, or a partial summary cannot complete a
ticket or run.

## 9. Failure and retry rules

Distinguish a launch that definitely failed before mutation from an unknown
worker status. For a clearly transient pre-mutation transport failure, record
it, re-read taken/activity/Git/PR state, and allow at most one logged launch
retry. If status is unknown, mark the lane waiting/blocked and dispatch nothing
conflicting. Never automatically retry failed implementation, migration, test,
build, or verification commands. Never use force takeover as fallback: a dead
worker's expired claim is transferred as in section 1, and a live one is
waited on. On resume, reconcile the unknown attempt from live state before
any new action.

## 10. Report

At the requested target, report every roster ticket exactly once in one of four
lists: **cleared** (closed out), **at target** (parked at the requested point),
**parked** (operator-only question, quoted with ticket id and recommendation),
or **skipped** (blocked, taken, or failed with the exact reason). A partial
roster is not a successful report. Finish the run record as `completed`,
`paused`, `blocked`, or `aborted` only when the corresponding predicate is
true, preserving the final ledger and report in immutable history.

## 11. Phase boundaries

Preparation uses each ticket's resolved gates, not a universal document list.
Execution uses its packet, ticket worktree, checklist and no-merge boundary.
Review uses current PR-head evidence and independence. Verification begins only
after a confirmed merge and exact merge SHA. Done requires live proof and
questions gates. Every stage move uses Kanmer; auto never edits board files or
bypasses MCP.

---

**No successor — this skill is the hand-off.** It drives the phase skills
in order for each roster ticket, stopping each at the requested target or an
operator-only question. When the roster is exhausted, control returns to the
operator with the four-list report above. The controller never merges its own
PR and never starts another ticket from a worker context.
