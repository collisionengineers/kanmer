# Where the change lands

| Path | Why |
|---|---|
| `packages/core/src/groups.ts` | **New.** Schema, storage, `deriveMembers`, group document paths, the id floor. |
| `packages/core/src/store.ts` | `createGroup`/`getGroup`/`listGroups`/`updateGroup`/`getGroupDoc`/`setGroupDoc`/`groupsForItem`; `assertGroups` on create and update. |
| `packages/core/src/types.ts` | Board `groupKinds`; item `groups`. |
| `packages/core/src/board.ts` | `DEFAULT_GROUP_KINDS`, `resolveGroupKinds`. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `packages/core/src/links.ts` `buildLinkIndex` | The precedent: one direction stored, the other derived. Groups follow it. |
| `packages/core/src/ids.ts:108-157` | The per-prefix id machinery to reuse, and why an on-disk floor matters when counters are derived state. |
| `packages/core/src/docpaths.ts` | The path-validation shape group documents mirror — minus the type vocabulary, since group context is free-form. |
