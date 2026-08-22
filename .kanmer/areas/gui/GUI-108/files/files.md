# Files — GUI-108

## Change surface

| Path | Purpose |
|---|---|
| `apps/gui/src/renderer/src/App.tsx` | Map failed move responses, request the existing gate status, render anchored actionable feedback, and select the missing document in the existing Editor. |
| `apps/gui/src/renderer/src/components/Board.tsx` | Carry the pointer anchor through the existing move callback for empty-column and card drops; preserve getGateStatus tint/tooltips. |
| `apps/gui/src/renderer/src/components/Editor.tsx` | Accept an optional initial document selection and route it through the existing document inventory/create affordance. |
| `apps/gui/src/renderer/src/lib/gateFeedback.ts` | Pure translation of current gate rejection reasons into target/boundary/requirement metadata and document types; no gate rules. |
| `apps/gui/src/renderer/src/components/Board.test.tsx` | Verify a drop forwards the target status, position, and pointer anchor. |
| `apps/gui/src/renderer/src/lib/gateFeedback.test.ts` | Verify missing-document, questions-resolved, multi-boundary, named requirement, and passthrough behavior. |
| `apps/gui/src/renderer/src/components/Editor.test.tsx` | Verify the selected missing document reaches the existing create-document editor state. |
| `apps/gui/src/renderer/src/styles.css` | Style and clamp the anchored feedback popover in both themes and narrow viewports. |
| `apps/gui/src/renderer/src/App.tsx` / existing client path | No new IPC or core files: gate status remains the existing main/preload/client channel. |

## Out of scope

- Core gate resolution, profiles, stage transitions, or MCP error wording.
- A second gate resolver or a new IPC channel.
- GUI-087 manual wording/artifacts, GUI-017 manual deep links, or unrelated board interactions.
- Claiming packaged Electron visual drag/drop proof from unit tests.
