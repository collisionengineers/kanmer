# Plan

## Fix the actual defect first

`dispatch.ts` calls `takeTicketPromptText` — the whole-ticket brief — for every
dispatch. `dispatchTicket` takes a `taskId`, looks it up with `dispatchTaskById`
and uses that prompt. Omitting the task keeps today's behaviour, so nothing
already wired breaks.

## Feasibility lives in core, and is deliberately permissive

`taskFeasibility(taskId, gates, docCounts)` → `{ ok, reason? }`, pure, in
`prompts.ts` beside the tasks it describes. Not in the renderer: it is a
statement about the task menu, and the task menu is core's.

**It disables almost nothing.** Only the two genuinely incoherent cases:

- **Execute** with no `plan/` — its prompt says "work the checklist" and there
  is none.
- **Verify** before the ticket has reached `review` — its prompt says "on merged
  main", and nothing is merged.

Everything else is enabled with a *warning* where a document it builds on is
missing. Disabling on judgement teaches people the menu is wrong and to ignore
it; a warning informs without blocking. A task producing a document the profile
does not require is legitimate — profiles set what is *owed*, not what is
allowed.

## Menu shape

`Dispatch ▸ <provider> ▸ <task>`, provider first because a user picks the agent
they have, then what to give it. Each task row shows its deliverable as the
description, so the menu says what will exist afterwards rather than what will
be attempted.

## The drawer

`DispatchStatus` gains `task` and `deliverable`. Without them two rows for the
same ticket are indistinguishable, and the drawer's job is telling you what is
running.

## Unchanged, deliberately

Dispatch still never pre-creates a worktree. Five of six tasks are read-only or
document-only; only `execute`'s prompt creates one. A picker that made a
worktree per task would leave five empty and confuse the sixth.

## Verification

Core unit tests for the feasibility matrix — the two disabled cases, and that
the other four stay enabled with warnings rather than blocks. Then the rail;
`plugin:build` because core changed.
