# Where the change lands

| Path | Change |
|---|---|
| `plugins/kanmer/skills/kanmer-groom/SKILL.md` | The label→group conversion procedure: preview, confirm, idempotent apply. |
| This repo's board | 8 epic groups + 2 horizons created; `groups` set on 40 tickets. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `packages/core/src/groups.ts` `deriveMembers` | Members and progress are derived — the conversion must never write a member list. |
| `packages/core/src/store.ts` `createGroup` | `(kind, title, body)`; kind validated against the board's `groupKinds`; ids allocated by the same machinery as tickets so they cannot collide. |
| `docs/architecture/adr/ADR-0001-group-membership-on-ticket.md` | Why membership lives on the ticket, and why that makes the conversion idempotent for free. |
| `packages/core/src/store.ts` `updateItem` | A no-op patch does not bump `updated` — so a second run is genuinely free, not just harmless. |
