# The dispatch task picker — research

## The SSOT already exists and is already right

`packages/core/src/prompts.ts` has `DISPATCH_TASKS`: six tasks, each with an
`id`, `label`, **`deliverable`** and a prompt builder. Its own comment states the
design: each done-condition is "a thing that either exists on disk or does not —
'the documents exist', not 'the research is good enough'".

So this ticket is not designing a task list. It is connecting one that is
already written to a menu that does not use it.

## What dispatch actually does today

`dispatch.ts:100` calls `takeTicketPromptText(ticketId)` — the **whole-ticket**
brief. Every dispatch runs the entire ticket end to end, unattended.

`prompts.ts:5-8` says that is the wrong default:

> the point of FRD-010 is that a background agent finishes one thing and stops,
> rather than running a whole ticket unattended.

So the defect is concrete: the granular prompts exist, are documented as the
point of the feature, and nothing calls them.

## Gate-aware enablement

`get_doc_gates` already returns `reachable` and `blockedBy` per stage, plus
per-requirement `satisfied`. Mapping a task to what it needs is the missing
piece — and it must be derived, not hardcoded, or it drifts from the profile.

The honest mapping is by **deliverable**, not by stage. "Write plan + checklist"
produces `plan/` and `checklist/`; whether that is *required* depends on the
profile, and a task can be perfectly sensible to run for a document the profile
does not demand. So enablement should not be "the gate requires it" but "this
is a coherent next step" — and the reason shown when it is not.

The clearly incoherent cases are few and real:
- **Execute** before a plan exists — the prompt says to work the checklist, and
  there is none.
- **Verify** before there is anything merged — the prompt says "on merged main".

Everything else is judgement, and disabling on judgement teaches people to
distrust the menu. Better: enable, and show what is missing as a warning under
the item.

## A thing that must not change

`dispatch.ts:71-72` and the ticket both say it: **dispatch never pre-creates a
worktree**. Only the execute task's own prompt does. If the picker started
creating one per task, five of the six tasks would get a worktree they never
use, and the sixth would find one already there.

## The drawer

`DispatchStatus` has no task field, so a running dispatch cannot say what it is
doing. Two rows for the same ticket are indistinguishable. Adding `task` and
`deliverable` to the status is what makes the drawer readable.
