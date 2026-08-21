---
name: kanmer-auto
description: Autonomously clear one explicit Kanmer group (epic or horizon), preserving a durable, resumable run record on that group while driving eligible tickets through their profile pipelines up to a requested point. Use when the user says "clear HZN-003", "work through 0.3.3", or "finish this epic". DO NOT USE FOR a single ticket or an ungrouped area — use the phase skills directly, or create/select a group first.
---

# Clearing a group autonomously

kanmer-auto is orchestration, not new mechanics: each ticket still goes
through the phase skills' procedures exactly as written — this skill decides
which tickets, in what order, and how many at once.

## Durable run state — required before dispatch

This skill runs **one explicit existing group** per invocation. Area-only and
ad-hoc selections have no durable batch owner: stop and ask the operator to
name or create the epic/horizon before mutating tickets or dispatching workers.
Do not add MCP tools, ticket fields, entities, leases, hidden local state, or
automatic merging to implement this protocol.

The durable state belongs in the group's documents, never in a ticket:

- Current-run pointer: `automation/current.md`
- Immutable run history: `automation/runs/<run-id>.md`

Create a path-safe UTC run id that is unique within that group; if its history
path already exists, append a numeric suffix until it does not. The history record uses
`assets/run-state-template.md`; it must retain these frontmatter keys:
`kind`, `schema`, `run_id`, `group`, `project_fingerprint`, `controller`,
`status`, `created_at`, `updated_at`, `lane_limit`, and `stop_reason`. Its
required headings are **Selection contract**, **Run invariants**, **Ticket
ledger**, **Event log**, and **Resume instruction**. `status` is exactly one of
`running`, `paused`, `blocked`, `completed`, or `aborted`; ledger dispositions
are exactly `queued`, `active`, `waiting`, `blocked`, `finished`, or `skipped`.

At startup, read `get_status`, `get_group`, the group's `context.md`, and
`automation/current.md` before any dispatch. If the current record is
`running`, `paused`, or `blocked`, resume it rather than creating a new run.
Validate the referenced record's schema, group, and project fingerprint.
Refuse before writing when its group or project fingerprint differs, or when a
different controller owns an active run. Reconcile the ledger against live
ticket state and live `get_doc_gates`; an interruption must never make the
controller repeat a completed action just because it cannot remember it.

For a new run, collect the gates-first roster first. Then write the complete
history record and read it back **before** writing `automation/current.md` from
`assets/current-run-template.md`, and read that pointer back before dispatch.
Update and read back both documents around every assignment and result, and
before an intentional pause, block, completion, or abort. Never overwrite a
history record; terminal state remains resumable evidence and the next run gets
a new history path.

The record contains operational state only: roster, target, lane partition,
skip reasons, worker outcomes, and concise operator answers. Record operator
answers as events so a resumed controller honours them without re-asking. Do not store
secrets, full prompts, or large command outputs in either document.

## 1. Gather and scope

- `get_status`, then `list_items group: "HZN-003"` for the named epic or
  horizon. Board order is the human's ordering — respect it. Group membership
  is derived in id order and is *not* a priority, so a group scopes the roster
  and nothing else. An optional `area` filter narrows to one subsystem's share
  of that group.
  Use `list_items`, not `get_group`, to build the roster: `get_group`'s derived
  members carry only id/title/stage, and the drop rules below need `taken` and
  `blocked`, while §3 needs `profile`.
- `get_group_doc` for the group's shared context — the constraint binding the
  batch is written there once and applies to every member.
- Drop: archived, `blocked: true`, and tickets taken by someone else
  (coordinate, don't `force`).
- Parse the **target point** from the request: "up to review" means each
  ticket stops once its PR is open and the ticket sits in the review stage;
  the default is full closeout (merge permitting — if merging is the human's
  call, tickets park in review and you say so). Resolve stage names against
  `list_board`.
- **Gates are hard, and per-ticket.** Call `get_doc_gates <id>` for every ticket
  in the roster and drive *that* ticket's boundaries — do not assume a common
  pipeline. Profiles differ in how many stages they walk and which documents
  they owe, so `reachable` on that call is the roster's routing table. Driving
  every ticket through one pipeline is the mistake this warning exists to
  prevent.
- **One gated boundary per move.** A lane advances a ticket one stage at a time;
  a move crossing two gated boundaries is refused. Partition the roster by
  profile so lanes with genuinely different pipeline lengths do not block each
  other.
- Set `docs_todo` on tickets that need a governing doc written so they are not
  stranded at the first gate.
- Tell the user the roster before starting: what you scoped by (naming the
  group, if you used one), which tickets, target point, what was skipped and
  why. A roster resolved from a group is worth showing back before anything
  starts — it is the one step the user cannot check by reading the request.

## 2. Wave 0 — route every ticket from its live gates

For every retained ticket, call `get_doc_gates <id>` and inspect its current
stage, reachable stages, and first unmet next-boundary requirement. Group the
roster by the next applicable phase/action, not by an assumed profile pipeline,
then dispatch only that phase through the existing phase skill. Do not create
optional documents merely to normalize the batch. A ticket with no preparation
phase currently required advances to its next applicable workflow action rather
than receiving speculative research. After each completed phase, re-read that
ticket's gates before routing its next phase.

Tickets whose routed phase surfaces user-only questions get parked and reported
— don't guess on the user's behalf.

This is not only a routing concern: a question can surface at any point, and a
lane that hits one **stops there and is reported as parked-on-a-question, named
and quoted** — never rolled into the generic failure bucket. The operator can
answer a question in seconds; they cannot answer one they were never shown. The
gates enforce *some* of the stopping — `get_doc_gates` says which boundaries
this ticket's profile actually has, and they are not the same for every profile —
but the merge is outside the engine entirely, so a lane can land code on a
question the operator never saw. Reporting it is therefore this skill's job, not
the engine's.

## 3. Partition into conflict-free lanes

Compare the file tables in each ticket's `files` document:

- Tickets touching **disjoint** files → different lanes, safe in parallel.
- Tickets with **overlapping** files → the same lane, run serially.
- A `blocks` edge forces ordering regardless of lanes: the blocker finishes
  (to the target point) before the blocked ticket starts.

Cap concurrency at ~3 lanes — enough to matter, few enough that rebases and
reviews stay manageable.

## 4. Execute the waves

Every lane works in its **own** worktree, and none of them touches
`.worktrees/kanmer` — in a repo set up through the GUI that is the board's own
worktree, on the board branch, with MCP rooted in it. It is never a lane's
worktree, never a rebase target, and never cleaned up. With ~3 lanes running git
surgery in parallel this is the invariant with the most chances to be broken.

Each lane's current ticket runs in its own subagent: `kanmer-plan` →
`kanmer-execute` (own worktree `.worktrees/<id>`, own branch) → independent
`kanmer-review` → `kanmer-verify` (validate on merged main, write proof) →
`kanmer-closeout` — each phase only as far as the target point allows. The
controller itself never runs `gh pr merge` or treats a passing PR as merged;
only the review workflow may merge after an independent passing review. After
anything merges to main, lanes still in flight rebase before opening their PRs:

```sh
git fetch origin && git rebase origin/main
```

A ticket that fails (tests won't pass, plan turns out wrong, rebase
conflicts beyond mechanical resolution) doesn't sink the run: release it,
append what happened to its checklist progress notes, move it back to the
appropriate stage, and continue the lane with the next ticket.

Record a ticket as `active` before assigning a worker, then record the worker,
branch/worktree, attempt, timestamp, action, and result as they become known.
Record the observed stage, gate, mutations, PR/error, and next action with each
result; append both lane-assigned and worker-result/reconciliation events. Read
live state immediately after a worker returns and write/read back state before
reusing that lane. On restart, re-read every roster ticket's links, documents,
gates, taken state, and activity, treating the live board as authoritative and
logging each discrepancy. It does not blindly redispatch active or finished
work. A user-only question becomes `waiting`, quoted in the event log, and
pauses the affected lane. Before any planned stop, write its precise reason to
`stop_reason`, update the pointer status, and read both documents back.

If your host has no subagent mechanism, run the same waves sequentially —
the lane partition still tells you the safe order.

## 5. Report

Finish with a standup-style summary: **cleared** (closed out),
**at target** (parked at the requested point, e.g. awaiting merge),
**parked** (user-only questions — **quote them**, with the ticket id and the
recommendation, so the operator can answer inline), **skipped**
(blocked / taken / failed, with reasons). Every ticket in the roster
appears in exactly one list — silent drops are how autonomous runs lose
trust.

Finish the run record as `completed`, `blocked`, `paused`, or `aborted` as
appropriate, preserving the final ledger and report in history. The pointer
continues to identify that terminal record so the operator can inspect it; a
later invocation creates a new run instead of rewriting it. Completion requires
every selected non-skipped ticket to reach the declared target and no active or
waiting lanes; otherwise retain the accurate paused or blocked state.

---

**No single successor — this skill *is* the hand-off.** It drives the phase
skills in order for each ticket in its roster:

    kanmer-research → -plan → -execute → -review → -verify → -closeout

stopping each ticket at the requested target point, and stopping the whole run
at any question only the operator can answer. When the roster is exhausted,
control returns to the operator with the four-list report above.
