# Where the change lands

| Path | Change |
|---|---|
| `renderer/src/lib/profileDraft.ts` | **New** — the validation mirror plus draft edits. Pure, so vitest reaches it. |
| `renderer/src/lib/profileDraft.test.ts` | **New**. |
| `renderer/src/components/Settings.tsx` | `ProfilesTab` becomes editable. |
| `renderer/src/styles.css` | Editor affordances. |
| `AGENTS.md` §7 | Record the third core↔renderer duplication pairing. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `packages/core/src/profiles.ts` `validateProfileMap` | The rules being mirrored — the mirror must match rule for rule. |
| `packages/core/src/profiles.ts` `parseRequirement` | Split order: `@` then `:` then `/`. A different order accepts strings core rejects. |
| `renderer/src/lib/settingsDraft.ts` | The existing draft pattern — clone, compare by JSON. |
| `shared/ipc.ts` `DocModel` | What `getDocModel` returns: the *resolved* model, not the raw board. |
| `packages/core/src/store.ts` `setBoard` | Whole-board write; the draft must preserve fields the editor does not touch. |
