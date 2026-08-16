# Post-implementation report

PR [#24](https://github.com/collisionengineers/kanmer/pull/24).

## File changes

| Path | Change |
|---|---|
| `packages/core/src/prompts.ts` | `taskFeasibility` + `TaskFeasibility`. |
| `packages/core/src/prompts.test.ts` | 7 new tests. |
| `apps/gui/src/main/dispatch.ts` | Takes `taskId`, uses that prompt, carries it on the status. |
| `apps/gui/src/shared/ipc.ts` | `DispatchOption`; `task`/`taskLabel`/`deliverable` on the status. |
| `apps/gui/src/main/index.ts` | `dispatchOptions` handler. |
| `preload`, `lib/client.ts` | Pass-through. |
| `apps/gui/src/renderer/src/App.tsx` | Nested menu, options fetch, drawer chip. |

## Against the governing docs

**FRD-010 R1** — the menu is driven by core's SSOT task list, not a copy.
Gate-aware enablement with reasons; drawer rows carry the task and its
deliverable.

## The real find

This ticket read like UI work. The substance was that **dispatch had never used
the granular prompts at all** — `prompts.ts`'s own header describes the feature
this ticket implements, and the code contradicted it. Six prompts, written and
unused.

## Decisions

**Feasibility blocks two cases, not six.** Only where a task's prompt is
literally unfollowable. A menu that greys out rows on judgement gets ignored,
and a task producing a document the profile does not require is legitimate.

**Options resolve in main.** `DISPATCH_TASKS` and `taskFeasibility` are runtime
values in core; restating them in the renderer would have been a fourth
core↔renderer duplication a week after AGENTS.md §7 was rewritten to list three.

## For review

**No dispatch was run.** Nothing spawned a real agent CLI. The claim that a
task-scoped agent stops after its deliverable rests on the prompt text saying
so — which is true of the whole feature, not just this change, but it means the
end-to-end behaviour is unverified.

**The menu is three levels deep** (Dispatch ▸ provider ▸ task) with seven rows
at the leaf. `ContextMenu`'s keyboard matrix was tested for two levels in
GUI-004; three is untested. It typechecks and the component is recursive, so
there is no reason to expect breakage — but "no reason to expect" is not a test.

**Feasibility reads `docCounts`, which counts documents, not their content.** A
`plan/` folder holding an empty file satisfies "has a plan" and unblocks
Execute. That is consistent with how gates work everywhere in v3, so it is not a
new weakness, but the menu now inherits it.

## What kanmer-verify should run

The 7 core tests; typecheck, build, boot; `plugin:check`; and with a running
app: open a card menu on a ticket with no plan and confirm Execute is greyed
with its reason, then dispatch a research task and confirm the drawer names it.
