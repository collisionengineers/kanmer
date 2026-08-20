# Checklist — SKILL-016

## Scope and orientation

- [x] Require exactly one existing epic/horizon.
- [x] Call `get_status` first.
- [x] Read group and `context.md`.
- [x] Build full roster with `list_items(group: ...)`.
- [x] Apply gates-first selection and record exclusions.
- [x] Stop before mutation when group/scope is invalid.

## Paths and templates

- [x] Generate path-safe UTC run id.
- [x] Avoid collision with numeric suffix.
- [x] Use `automation/current.md` exactly.
- [x] Use `automation/runs/<run-id>.md` exactly.
- [x] Add schema-v1 run template.
- [x] Add pointer template only if needed.
- [x] Include all required frontmatter fields.
- [x] Include Selection contract, Run invariants, Ticket ledger, Event log, Resume instruction.
- [x] Define run/ticket status enums.
- [x] Exclude secrets/full prompts/large outputs.

## Existing-run safety

- [x] Read current pointer before new run.
- [x] Validate referenced record/schema/group/project.
- [x] Resume running/paused/blocked record by default.
- [x] Refuse other-controller running record.
- [x] Refuse project/group mismatch before writes.
- [x] Preserve completed/aborted history.

## Before dispatch

- [x] Evaluate live gates/dependencies/taken state for whole roster.
- [x] Write initial ordered ledger and invariants.
- [x] Write full run record first.
- [x] Read back/validate full record.
- [x] Write current pointer second.
- [x] Read back/validate pointer.
- [x] Dispatch no worker before both readbacks.

## During run

- [x] Re-read ticket/gates/dependencies before assignment.
- [x] Record worker/action/attempt/branch/worktree/timestamp.
- [x] Append lane-assigned event.
- [x] Write/readback before dispatch.
- [x] Re-read live state immediately after worker result.
- [x] Record result/mutations/stage/gate/PR/error/next action.
- [x] Append worker-result/reconciliation event.
- [x] Write/readback before reusing lane.
- [x] Never exceed lane cap.

## Stop and resume

- [x] Record exact waiting condition/resume check.
- [x] Use paused/blocked rather than false completion.
- [x] Update status/stop reason/remaining roster/resume instruction before stop.
- [x] Write/readback full record then pointer before stop.
- [x] On resume read status/group/current/run before mutation.
- [x] Re-read every roster ticket, links, gates, docs, taken, activity.
- [x] Treat live board as authoritative.
- [x] Log every reconciliation discrepancy.
- [x] Do not replay completed mutation.
- [x] Do not force takeover.
- [x] Write reconciled state before new dispatch.

## Completion and history

- [x] Declare target boundary at run creation.
- [x] Verify every selected non-skipped ticket reaches target.
- [x] Require no active/waiting lanes.
- [x] Add final outcomes/event/timestamps.
- [x] Write/readback final record and pointer.
- [x] Start second run without overwriting first.

## Validation

- [x] Update numbered skill workflow and exact tool paths.
- [x] Add skill/prose validator assertions.
- [x] Run disposable three-ticket scenario.
- [x] Prove state exists before first dispatch.
- [x] Interrupt after one result.
- [x] Resume from fresh context using Kanmer only.
- [x] Reconcile independent ticket change without replay.
- [x] Prove wrong-project refusal.
- [x] Prove other-controller refusal.
- [x] Prove completion and history retention.
- [x] Run `npm run verify:skills`.
- [x] Run root tests/typecheck/verify.
- [x] Run `git diff --check` and inspect status.
- [x] Record evidence in post-implementation report.
- [x] Stop before merge.

## Closeout — SKILL-016

- [x] PR merge verified (`gh pr view --json state,mergedAt`)
- [x] proof.md finalised (PR URL + merge date appended)
- [x] Moved to final stage
- [x] Outcome recorded in ticket body (PR link, follow-ups)
- [x] cd out of worktree; `git worktree remove .worktrees/skill-016`
- [ ] `git branch -d skill-016-durable-auto-run` (`-D` if squash/rebase-merged)
- [x] `git fetch --prune` + `git worktree prune`
- [x] `take_ticket action: "release"`

- [x] cd out of worktree; `git worktree remove .worktrees/skill-016`
- [x] `git branch -D skill-016-durable-auto-run` after merged-PR verification
- [x] `git push origin --delete skill-016-durable-auto-run`; `git fetch --prune` + `git worktree prune`
- [x] `take_ticket action: "release"`
