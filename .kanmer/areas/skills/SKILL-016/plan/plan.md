# Plan — SKILL-016: durable `kanmer-auto` run state

## Objective

Make every group-scoped `kanmer-auto` run restartable from Kanmer alone by writing a versioned human/machine-readable run record before dispatch, updating it at every state transition, reconciling it against live board state on resume, and retaining complete run history.

## Starting state

- `kanmer-auto` derives a ticket roster and may run up to roughly three lanes.
- Current progress is primarily held in model/chat context.
- Groups already support free-form context documents through MCP.
- Tickets, docs, links, gates, taken state, activity, and Git/PR state remain the underlying sources of truth.

## Required changes

### 1. Require an explicit run scope

1. Update skill invocation/orientation to require exactly one existing epic or horizon id.
2. Call `get_status` first and capture project fingerprint/capability/server orientation.
3. Call `get_group` and read its shared `context.md` before selecting work.
4. Build the ordered roster through `list_items(group: ...)`, not `get_group`'s reduced member summaries alone.
5. Apply existing selection filters and gates-first logic from SKILL-020.
6. Record excluded/archived/already-complete/unsupported tickets and reasons.
7. If no valid group is supplied or the group cannot be read, stop before any dispatch/mutation.

### 2. Define stable run identity and paths

8. Generate a UTC path-safe run id `YYYYMMDDTHHMMSSZ-<controller-slug>`.
9. Sanitize controller slug to lowercase ASCII alphanumerics/hyphens and cap its length.
10. Probe `automation/runs/<run-id>.md`; append `-2`, `-3`, etc. if occupied.
11. Use exactly `automation/current.md` for the pointer.
12. Use exactly `automation/runs/<run-id>.md` for the complete record.
13. Never place run state in a local file, repo root, arbitrary ticket scratch, or chat-only note.

### 3. Add canonical templates

14. Add schema-v1 run-state template with required YAML fields.
15. Add current-pointer template if not kept canonically inline.
16. Include required headings: Selection contract, Run invariants, Ticket ledger, Event log, Resume instruction.
17. Define exact enums for run and ticket dispositions.
18. Include project/group/controller/lane cap/created/updated/stop reason.
19. Include per-ticket document ids/versions rather than copying whole plans.
20. Include branch/worktree/worker/attempt/PR only when known.
21. Keep secrets, tokens, full prompts, and large tool outputs out of state.

### 4. Read existing current state before starting

22. Read `automation/current.md`; missing content means no prior run.
23. If present, parse/validate its kind/schema/group/project/run path/status.
24. Read the referenced full run record.
25. If status is `running`, `paused`, or `blocked`, default to resume/reconcile rather than silently create another run.
26. If a different controller owns a `running` record, stop and report owner, updated time, roster, and resume path.
27. Permit a new run after `completed`/`aborted` or explicit operator direction, without overwriting history.
28. Refuse project-fingerprint/group mismatch before writes or dispatch.

### 5. Create state before first dispatch

29. After gates-first roster analysis, construct complete initial ledger in MASTERPLAN/group order.
30. Record each ticket's observed stage/profile/gate requirements/dependencies/taken state and next safe action.
31. Set ticket disposition to queued/waiting/blocked/skipped as appropriate.
32. Record all run invariants: lane cap, no force takeover, no merge, board-worktree prohibition, expected-project compatibility rule.
33. Add `run-created` and `roster-evaluated` events.
34. Write the full run record first with `set_group_doc`.
35. Read it back and validate required fields/headings/path.
36. Write `automation/current.md` second, pointing to the validated record.
37. Read the pointer back before dispatch.
38. If either write/readback fails, stop with no worker dispatch.

### 6. Update around each lane action

39. Before dispatching a worker, re-read the target ticket/gates/taken/dependencies.
40. Update ledger with active disposition, worker, planned action, branch/worktree where known, attempt number, and timestamp.
41. Append a `lane-assigned` event.
42. Write/readback the full run record before sending the worker task.
43. Dispatch only after the state write succeeds.
44. On worker response, immediately re-read live ticket/docs/activity/PR state.
45. Record result, observed mutations, new stage/gate, PR/commit refs, error, and next action.
46. Append a `worker-result`/`reconciled` event.
47. Write/readback state before assigning new work to the freed lane.
48. Never let active ledger lanes exceed configured lane limit.

### 7. Stop/wait/failure behavior

49. Before waiting on external work, set affected tickets to waiting with exact condition and resume check.
50. When no safe lane is available, classify the run as paused or blocked—not completed.
51. Before any intentional stop, update `status`, `stop_reason`, remaining roster, and one deterministic resume instruction.
52. Write/readback the full record, then update/readback current pointer.
53. Record unresolved questions/dependencies/occupancy/verification failure precisely; do not summarize as generic “blocked”.
54. On controller/tool failure, attempt a final `paused` record only if board writes remain safe; never claim success after a failed state write.
55. `aborted` requires explicit operator/controller decision and reason.

### 8. Resume and reconcile

56. On resume, orient with `get_status`, group/current/run docs before any ticket mutation.
57. Validate schema/project/group/controller ownership and run status.
58. For every roster ticket, re-read full item, links, gate report, required docs/versions, taken state, and recent activity.
59. Treat live board data as authoritative over ledger stage/disposition.
60. Where GitHub/PR state is needed, use the allowed integration in the executing environment; durable state itself is not proof.
61. Record every discrepancy as a reconciliation event with old/new values.
62. Mark actions already completed; do not replay writes/takes/moves.
63. Preserve active ownership by other actors and stop rather than force takeover.
64. Recompute ready lanes from current gates/dependencies and continue from deterministic resume instruction.
65. Write reconciled state before dispatching again.

### 9. Completion and history

66. Define the run target boundary explicitly at creation.
67. Re-evaluate every selected non-skipped ticket against that target.
68. Require no active/waiting lanes and no unresolved blocking condition for `completed`.
69. Append final per-ticket outcomes and a `run-completed` event.
70. Set completion timestamp/stop reason null and final resume instruction “none—run complete”.
71. Write/readback full record and current pointer.
72. Never delete/overwrite the historical run record when a later run starts.

### 10. Skill validation and scenario proof

73. Update `SKILL.md` with numbered read/create/update/resume/stop workflow and exact tool calls/paths.
74. Reference the templates rather than duplicating schema prose in multiple places.
75. Add skill validators asserting required paths, fields, read-before-dispatch, and write-before-stop language.
76. Create a disposable group with at least three varied tickets.
77. Start run and assert state exists before first dispatch.
78. Interrupt after one result and discard controller chat context.
79. Resume using only status/group/run/ticket reads.
80. Change one ticket independently and prove reconciliation avoids repeating action.
81. Prove wrong-project and other-controller-running state refuse without mutation.
82. Complete the run and start a second run; prove first history remains.
83. Run `npm run verify:skills`, root tests/verify, and `git diff --check`.
84. Record scenario paths/events/readback evidence in post-implementation report.

## Expected files

- `plugins/kanmer/skills/kanmer-auto/SKILL.md`
- `plugins/kanmer/skills/kanmer-auto/assets/run-state-template.md`
- optional current-pointer template
- canonical skill verification scripts/routing
- FRD-023 only when governing delta is required

## Acceptance checks

- Exactly one target group is mandatory.
- Current pointer and immutable-per-run history paths are exact and documented.
- State exists/readbacks before first dispatch.
- Ledger updates before assignments and after results, and before every stop.
- Resume begins with project/group/run/live-ticket reconciliation.
- Live board state overrides stale ledger and completed actions are not replayed.
- Other-controller/wrong-project cases stop safely.
- Run statuses and completion semantics are exact.
- Historical run is retained across later runs.
- No new MCP tool/entity, lease, local hidden state, or automatic merge.
- Skill validators and disposable interruption/resume scenario pass.

## Verification commands

```bash
npm run verify:skills
npm test
npm run typecheck
npm run verify
git diff --check
git status --short
```

Use Kanmer tools on a disposable group to capture the start/interruption/resume/completion proof.

## Failure and deviation rules

- Stop before dispatch if group, project identity, current record, template validation, or state readback fails.
- Stop rather than overwrite another active controller.
- Do not replay mutations from stale state, force ticket takeover, merge PRs, add a lease system, add MCP tools, or store secrets/prompts locally.
- Do not mark completed while any selected non-skipped ticket is short of target or any lane waits.
- Do not rebuild MCP plugin bytes for a skill-only change.
- Do not merge; hand off for independent review.

## Stop condition

Stop when an interrupted multi-ticket run can be resumed in a fresh controller context from `automation/current.md` and its referenced group run record, reconciles safely against live board state without repeating work, records every assignment/result/stop before losing control, retains history across a second run, passes skill validation, and is ready for review.
