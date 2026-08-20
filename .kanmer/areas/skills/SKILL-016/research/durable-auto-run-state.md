# Research — SKILL-016 durable `kanmer-auto` run state

## Problem

`kanmer-auto` coordinates several tickets and may dispatch multiple workers. Chat context is not durable: a controller restart, context truncation, worker failure, or provider hand-off can lose which tickets were selected, which lane owns each ticket, what the next gate requires, and why the run stopped. Reconstructing only from current stages is unsafe because stages do not encode the run's roster, attempt, dispatch id, last completed action, or stop reason.

Durable state belongs on the Kanmer board, not in a local temp file or model memory. It must be readable before resuming and must never replace tickets, groups, activity, or gated pipeline documents as sources of truth.

## Storage decision

A `kanmer-auto` invocation operates on an explicit group (epic or horizon). Store run state as free-form **group context documents**:

- `automation/current.md` — small pointer/summary for the latest active or most recent run.
- `automation/runs/<run-id>.md` — complete run record, rewritten as state advances.

The run id is stable and path-safe, for example `YYYYMMDDTHHMMSSZ-<actor-slug>`, with a numeric suffix when that path already exists. The current pointer names the run id/path and status. Historical run files are retained; starting a new run never overwrites a different run's record.

Group docs are operational state, not gated ticket documents. They do not satisfy research/plan/proof gates. The controller is the sole writer for the run record; workers report through ticket state/docs and return values. If the current pointer names a `running` run owned by another controller, stop rather than overwrite it. This is an occupancy convention, not a lease system.

If the invocation does not identify exactly one existing group, stop and ask for/derive a group before dispatch. Do not create a hidden board-wide state file or attach the run arbitrarily to the first ticket.

## State format

Use Markdown with machine-readable YAML frontmatter and human-readable sections. Schema version 1 fields:

```yaml
kind: kanmer-auto-run
schema: 1
run_id: 20260820T130000Z-codex
group: HZN-004
project_fingerprint: kanmer-proj-v1:...
controller: codex
status: running
created_at: 2026-08-20T13:00:00Z
updated_at: 2026-08-20T13:05:00Z
lane_limit: 3
stop_reason: null
```

Statuses: `running`, `paused`, `blocked`, `completed`, `aborted`. Do not invent “success” when some selected ticket is incomplete.

The body contains:

- **Selection contract** — group, filters, original ordered roster, exclusions and reasons.
- **Run invariants** — project fingerprint, board branch/worktree identity, lane cap, no-merge boundary.
- **Ticket ledger** — one stable row/section per ticket: order, observed stage, gate boundary/requirements, disposition (`queued|active|waiting|blocked|finished|skipped`), worker, branch/worktree, attempt, last action, last result, PR, error/stop reason, timestamp.
- **Event log** — append-only logical events with timestamp/ticket/action/result. The whole file may be replaced, but previous event entries are retained.
- **Resume instruction** — deterministic next controller action.

Do not copy whole plans/research into the run file; link document ids/versions. Ticket files and live gate reports remain authoritative.

## Write cadence

Write state:

1. before first dispatch;
2. immediately after a lane is assigned;
3. after every worker result or ticket mutation;
4. before waiting on external work;
5. before every intentional stop;
6. after controller recovery/reconciliation;
7. at completion/abort.

The controller must update `updated_at`, ledger, event log, and resume instruction together. Update `automation/current.md` after the run record, so the pointer never references unwritten state.

## Resume algorithm

On invocation:

1. call `get_status` and capture project fingerprint/capabilities;
2. read group and `automation/current.md`;
3. if it points to a running/paused/blocked record, read that exact run file;
4. compare project fingerprint and group;
5. re-read every roster ticket, links, taken state, docs, and `get_doc_gates`;
6. treat board state as truth and reconcile stale ledger entries;
7. record reconciliation events;
8. resume only actions whose prerequisites remain valid.

Never repeat a mutation solely because the ledger says it was pending. Check live ticket/activity/PR state first. Never take over a ticket owned by another actor without explicit operator instruction.

## Completion semantics

`completed` means every selected non-skipped ticket reached the run's declared target boundary and no lane is active/waiting. `blocked` means no safe next action exists due to unresolved questions, dependency, occupancy, failed verification, or missing capability. `paused` is an intentional resumable operator/controller stop. `aborted` records explicit abandonment and reason.

The file must record remaining tickets and the exact resume/recovery action for all non-completed outcomes.

## Verification

Use a disposable group/board scenario:

- start a three-ticket run;
- dispatch up to the lane cap;
- interrupt after one result;
- restart from no chat context using only Kanmer reads;
- reconcile one ticket whose live stage changed independently;
- refuse a project-fingerprint mismatch and an active run owned by another controller;
- complete and retain history;
- start a second run without overwriting the first.

Add prose/template verification to ensure required headings/fields and the read-before-dispatch/update-before-stop rules remain present.

## Non-goals

- No new MCP run entity/tool.
- No distributed lock/lease.
- No hidden local state.
- No replacement for ticket docs, `taken`, activity, or GitHub state.
- No automatic merge.
- No board-wide run without an explicit group.
