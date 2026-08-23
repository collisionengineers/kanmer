# Files

## In scope

- `apps/gui/src/renderer/src/App.tsx` session-restore handling for failed `openProject` calls.
- The existing renderer advisory/log path and focused session/App tests needed to make the failure observable without stopping other tab restores.

## Out of scope

- Changing the persisted session format or tab ordering behavior.
- Hiding restore failures, silently dropping errors, or changing unrelated project-open guards.

## Evidence map

- [[GUI-033]] historical implementation owns session persistence.
- `docs/functional/frd/FRD-019-gui-shell.md` requires session restore and no silent data loss.
- Current code contains `catch { /* skip an unopenable restored tab */ }` in the restore loop.

## Acceptance evidence

- A failed restored project is observable through the existing non-blocking advisory/log surface with safe, non-secret context.
- Other restorable tabs still open and the app remains usable.
- A regression test proves the failure is surfaced and not swallowed.
- Focused GUI tests, typecheck, and the relevant build/check pass.
