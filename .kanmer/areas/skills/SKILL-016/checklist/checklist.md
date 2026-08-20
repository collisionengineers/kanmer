# Checklist — SKILL-016

## Scope and orientation

- [ ] Require exactly one existing epic/horizon.
- [ ] Call `get_status` first.
- [ ] Read group and `context.md`.
- [ ] Build full roster with `list_items(group: ...)`.
- [ ] Apply gates-first selection and record exclusions.
- [ ] Stop before mutation when group/scope is invalid.

## Paths and templates

- [ ] Generate path-safe UTC run id.
- [ ] Avoid collision with numeric suffix.
- [ ] Use `automation/current.md` exactly.
- [ ] Use `automation/runs/<run-id>.md` exactly.
- [ ] Add schema-v1 run template.
- [ ] Add pointer template only if needed.
- [ ] Include all required frontmatter fields.
- [ ] Include Selection contract, Run invariants, Ticket ledger, Event log, Resume instruction.
- [ ] Define run/ticket status enums.
- [ ] Exclude secrets/full prompts/large outputs.

## Existing-run safety

- [ ] Read current pointer before new run.
- [ ] Validate referenced record/schema/group/project.
- [ ] Resume running/paused/blocked record by default.
- [ ] Refuse other-controller running record.
- [ ] Refuse project/group mismatch before writes.
- [ ] Preserve completed/aborted history.

## Before dispatch

- [ ] Evaluate live gates/dependencies/taken state for whole roster.
- [ ] Write initial ordered ledger and invariants.
- [ ] Write full run record first.
- [ ] Read back/validate full record.
- [ ] Write current pointer second.
- [ ] Read back/validate pointer.
- [ ] Dispatch no worker before both readbacks.

## During run

- [ ] Re-read ticket/gates/dependencies before assignment.
- [ ] Record worker/action/attempt/branch/worktree/timestamp.
- [ ] Append lane-assigned event.
- [ ] Write/readback before dispatch.
- [ ] Re-read live state immediately after worker result.
- [ ] Record result/mutations/stage/gate/PR/error/next action.
- [ ] Append worker-result/reconciliation event.
- [ ] Write/readback before reusing lane.
- [ ] Never exceed lane cap.

## Stop and resume

- [ ] Record exact waiting condition/resume check.
- [ ] Use paused/blocked rather than false completion.
- [ ] Update status/stop reason/remaining roster/resume instruction before stop.
- [ ] Write/readback full record then pointer before stop.
- [ ] On resume read status/group/current/run before mutation.
- [ ] Re-read every roster ticket, links, gates, docs, taken, activity.
- [ ] Treat live board as authoritative.
- [ ] Log every reconciliation discrepancy.
- [ ] Do not replay completed mutation.
- [ ] Do not force takeover.
- [ ] Write reconciled state before new dispatch.

## Completion and history

- [ ] Declare target boundary at run creation.
- [ ] Verify every selected non-skipped ticket reaches target.
- [ ] Require no active/waiting lanes.
- [ ] Add final outcomes/event/timestamps.
- [ ] Write/readback final record and pointer.
- [ ] Start second run without overwriting first.

## Validation

- [ ] Update numbered skill workflow and exact tool paths.
- [ ] Add skill/prose validator assertions.
- [ ] Run disposable three-ticket scenario.
- [ ] Prove state exists before first dispatch.
- [ ] Interrupt after one result.
- [ ] Resume from fresh context using Kanmer only.
- [ ] Reconcile independent ticket change without replay.
- [ ] Prove wrong-project refusal.
- [ ] Prove other-controller refusal.
- [ ] Prove completion and history retention.
- [ ] Run `npm run verify:skills`.
- [ ] Run root tests/typecheck/verify.
- [ ] Run `git diff --check` and inspect status.
- [ ] Record evidence in post-implementation report.
- [ ] Stop before merge.
