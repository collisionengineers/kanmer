# Files — GUI-068

## Where the change lands

| Path | Why |
|---|---|
| `apps/gui/src/main/updater.ts` | Change only if measured respawn timing disproves the current retry/settle constants or the automatic install path exposes a defect. |
| `apps/gui/src/main/mcp-sessions.ts` | Change only if the real stop/probe behavior differs from the verified contract. |
| `apps/gui/src/main/mcp-sessions.test.ts` | Extend when a measured defect requires a logic correction. |
| `apps/gui/src/renderer/src/lib/update.ts` and its tests | Touch only if the refusal text or decision surface is wrong during the visual run. |
| Ticket proof assets | Store the refusal screenshot and redacted command/timing logs used by proof. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `docs/functional/frd/FRD-021-auto-update.md` | Defines the automatic update, restart gate, and packaged-build acceptance contract. |
| `apps/gui/src/main/updater.ts` | Shows the non-cancellable boundary and where session clearance occurs. |
| `apps/gui/src/shared/mcp-sessions.ts` | Defines the installed-process classification used by warning and stop paths. |
| GUI-064 `proof/proof.md` | Names the three evidence gaps this ticket must answer and the prior measured baseline. |
| `apps/gui/electron-builder.yml` | Defines the installer and update feed being exercised. |

## Ripple effects

A code correction would require GUI tests, full typecheck, packaged `dist:check`, update artifacts, and regenerated proof. An evidence-only pass changes ticket documents/assets but no product source.

## Out of scope

Reworking the update architecture, moving MCP outside the install directory, changing release publication mechanics, or treating unit tests/source strings as substitutes for the real two-version cycle.
