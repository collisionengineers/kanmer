# Where the change lands

| Path | Why |
|---|---|
| `components/GroupView.tsx` | **New.** Goal, progress, editable context, derived members. |
| `App.tsx` | `openGroup` state and the panel render. |
| `shared/ipc.ts`, `main/index.ts`, `preload/index.ts`, `lib/client.ts` | Six group channels. |
| `styles.css` | Progress bar, member table. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `packages/core/src/groups.ts` `deriveMembers` | Where members and progress come from - and that archived members are listed but not counted. |
| `components/Editor.tsx` | The panel shape this mirrors, so a group opens the way a ticket does. |
| `lib/markdown.ts` | `renderMarkdown` needs a known-id set; group prose has no ticket wiki-links, so it gets an empty one. |
