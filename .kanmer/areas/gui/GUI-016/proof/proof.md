# Proof

PR [#24](https://github.com/collisionengineers/kanmer/pull/24), merged.
Verified on the merged base.

## The behaviour that changed

Before: every dispatch ran `takeTicketPromptText` — the whole ticket, unattended.
After: a dispatch given a task runs **that task's prompt** and stops at its
deliverable. `dispatchTaskById` rejects an unknown id rather than silently
falling back, so a typo fails loudly.

Omitting the task still runs the whole ticket, so every existing caller is
unchanged — and the menu offers "Whole ticket" as a deliberate choice rather
than leaving it as the only behaviour.

## Feasibility, asserted as a matrix

7 tests in `prompts.test.ts`:

- **execute** blocked with no `plan/`, and the reason names what to dispatch
  first; allowed with a plan, warning when the checklist is missing
- **verify** blocked at `backlog`/`preparing`/`implementing`, allowed at
  `review`/`verifying`/`done` — all six stages asserted, not a sample
- the four read-only tasks are **never** blocked
- thin inputs produce a `warning`, never a block
- an unknown task id is permitted (the default is a decision, not an oversight)
- **every id in `DISPATCH_TASKS`** is feasible in a well-formed state, so a task
  added later without thinking about feasibility is visibly taking the default

## Worktree discipline

`grep "worktree add|mkdir.*worktrees" dispatch.ts` → **one** hit, and it is the
comment stating the rule. Dispatch still creates nothing.

## Rail

core **132 → 139**, gui 176, `smoke.mjs` 120/120, typecheck, GUI build, boot
exit 0, `plugin:build` + `plugin:check` (29 tools, bytes match).

## Not proven

**No agent was ever spawned.** Nothing ran a real CLI. The claim that a
task-scoped agent stops after its deliverable rests on the prompt saying so.
That is true of the whole feature rather than this change alone, but it means
the end-to-end behaviour is unverified by anything here.

**Three-level menu nesting is untested.** `ContextMenu`'s keyboard matrix was
tested at two levels; this adds a third with seven leaf rows. The component is
recursive and it typechecks, but "no reason to expect breakage" is not a test.

**`docCounts` counts files, not content.** An empty file under `plan/` unblocks
Execute. Consistent with how every gate in v3 behaves, so not a new weakness —
but the menu now inherits it.
