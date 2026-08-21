# Files — GUI-081

## Change surface

| Path | Change | Risk / ripple |
|---|---|---|
| `docs/functional/frd/FRD-024-in-app-manual.md` | Replace the stale R4 gate-help requirement with an explicit withdrawal record; remove AC3 and renumber subsequent acceptance criteria. | Medium governance risk: wording must distinguish the removed Settings affordance from the never-built gate-block affordance and retain actual manual access. |

## Context files

| Path | Why read it |
|---|---|
| `apps/gui/src/renderer/src/lib/gateError.ts` | Confirms shipped gate failure guidance is text translation, not a manual deep-link affordance. |
| `apps/gui/src/renderer/src/lib/gateError.test.ts` | Confirms the actual user-facing gate-error contract owned by GUI-087. |
| `docs/manual/gates.md` | Confirms the user guide is present and is the manual chapter for gate behaviour. |
| `docs/functional/frd/FRD-024-in-app-manual.md` | Governing document being amended; acceptance numbering must remain coherent. |

## Deliberately out of scope

- Adding a `?` control, deep link, or any GUI implementation.
- Changing `friendlyGateError`, its tests, F1, Help-menu routing, or manual content.
- Reversing GUI-074 or changing the broader manual architecture.
