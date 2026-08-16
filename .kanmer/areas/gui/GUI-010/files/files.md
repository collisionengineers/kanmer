# Where the change lands

| Path | Change |
|---|---|
| `packages/core/src/store.ts` | `addReference`, `removeReference` — the copy, with containment. |
| `packages/core/src/store.test.ts` | Containment, collision suffixing, removal. |
| `apps/gui/src/shared/ipc.ts` | Three channels. |
| `apps/gui/src/main/index.ts` | Picker dialog, `shell.openPath`, handlers. |
| `apps/gui/src/preload/index.ts`, `renderer/src/lib/client.ts` | Pass-through. |
| `apps/gui/src/renderer/src/components/Editor.tsx` | Upload button, drop zone, list. |
| `apps/gui/src/renderer/src/styles.css` | Drop-zone affordance. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `packages/core/src/docpaths.ts` `listReferences`, `docDirIn` | The read side already exists; `reference/` resolves the same way a doc folder does. |
| `packages/core/src/profiles.ts` `GATE_EXEMPT_DIRS` | `reference/` can never satisfy a gate — so no gate logic is needed here, and none should be added. |
| `packages/core/src/paths.ts` `assertSafeRepoPath` | The containment shape to follow: reject `..` and absolute escapes with a named error. |
| `apps/gui/src/main/index.ts:656` `openRepoDoc` | The existing `shell.openPath` handler to mirror. |
| `apps/gui/src/renderer/src/components/Editor.tsx:113` `docsInfo` | Already holds `references`; the list renders from state that is already fetched. |
