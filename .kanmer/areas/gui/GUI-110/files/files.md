# Files — GUI-110

## Where the change lands

| Path | Why |
|---|---|
| `packages/ui/src/demo.tsx` | Add the empty `dispatch.providers` object to the browser demo's in-memory AppSettings fixture so all existing demo bridge methods remain assignable to the GUI-075 AppSettings contract. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `apps/gui/src/shared/ipc.ts` | GUI-075's shared `AppSettings` type requires `dispatch`; the fixture must satisfy this type without importing runtime Electron code. |
| `apps/gui/src/main/settings.ts` | Shows the real settings ownership/persistence boundary; GUI-110 must not add provider behavior or change the machine-local settings implementation. |
| `.worktrees/gui-075/packages/ui/src/demo.tsx` | The GUI-075 worktree contains the same intended one-line shape and confirms this remediation belongs on top of that contract change. |
| `.kanmer` ticket GUI-075 / PR #142 evidence | The hosted compiler failure and dependency relationship that this ticket repairs. |

## Ripple effects

The fixture's `settings` object and all existing spread-based demo bridge methods gain the required field. GUI-075's authoritative root typecheck can then proceed past `@kanmer/ui`; provider runtime behavior, dispatch options, renderer UI, and real settings persistence are unchanged.

## Out of scope

Do not modify `AppSettings`, GUI-075 provider behavior, provider registries, dispatch execution, settings persistence, IPC types, tests unrelated to the fixture, or any generated artifact. Do not weaken typecheck assertions or add a fake provider configuration.
