# Files — GUI-097

## Modify

| Path | Exact change |
|---|---|
| `apps/gui/src/renderer/src/components/Editor.tsx` | Export local `EditorMode`; accept `mode`; map modes to starting tabs; add mode selector/label; apply starting tab once per open/explicit mode change; dim non-primary tabs without hiding/disabling; use existing dirty-tab guard. |
| `apps/gui/src/renderer/src/App.tsx` | Replace selected-ID-only opening state with an ephemeral editor-open request carrying mode; centralize `openEditor(id, mode="approval")`; board/wiki/card opens use Approval; dispatch actions may pass Execution; session restore defaults Approval. |
| `apps/gui/src/renderer/src/components/Editor.test.tsx` | Extend GUI-096 tests for all four initial mappings, missing-doc empty states, dim-not-hide, explicit mode switch, dirty guard, and no reset on item refresh. |
| `apps/gui/src/renderer/src/lib/session.ts` and test only if selection state is persisted through its types | Keep persisted selected ID compatible; explicitly restore Approval rather than persisting mode. Do not migrate settings unless typecheck requires a local default. |
| `apps/gui/src/renderer/src/styles.css` | Minimal mode selector and dimming styles with sufficient contrast/focus; no hidden tabs. |

## Reuse unchanged

- GUI-096 Scratch tab and context pane.
- Existing `tryTab` dirty confirmation.
- Existing pipeline `DocEditor` empty/create states.
- Existing dispatch option eligibility and provider execution.
- Existing Board/Standup/Archived views and IPC/client APIs.

## Exact enum/mapping

```ts
type EditorMode = "approval" | "execution" | "review" | "evidence";
approval  -> "ticket"
execution -> "plan"
review    -> "scratch"
evidence  -> "proof"
```

## Do not modify

- Core/MCP/IPC/preload, ticket/board schema, gates, stages, doc types, dispatch eligibility, or session file format solely to persist mode.
- Hide/remove/disable tabs, create a fourth app view, infer mode from status, or automatically switch mode on every item update.
- Plugin/manual/package/lock files.
