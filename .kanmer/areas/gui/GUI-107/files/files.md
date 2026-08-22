# Files — GUI-107

## Existing files to extend

| File | Role | Change | Reason |
| --- | --- | --- | --- |
| apps/gui/src/renderer/src/components/TicketCreate.tsx | New-ticket form | Add custom-only requirements draft, resolved vocabulary, validation, and requires in create input | The form currently drops inline requirements |
| apps/gui/src/renderer/src/components/Editor.tsx | Ticket editor | Track requires in snapshot/diff/conflict flow and add the same custom-only editor | The editor currently drops edits |
| apps/gui/src/renderer/src/lib/profileDraft.ts | Renderer validation mirror | Reuse existing exported parser/validation functions; add only a narrowly scoped adapter if tests show the existing API cannot represent ticket drafts | Keep parser rules single within the renderer mirror and avoid Settings redesign |
| apps/gui/src/renderer/src/components/Editor.test.tsx | Editor tests | Add deterministic custom requirements render/validation/save coverage | Protect edit and conflict diff behavior |
| apps/gui/src/renderer/src/components/TicketCreate.test.tsx (new if absent) | Create-form tests | Add deterministic custom requirements render/validation/create coverage | Protect new-ticket behavior |

## Confirmed no-change surfaces

- packages/core/src/types.ts and packages/core/src/profiles.ts: existing requires model and validation are the source of truth.
- apps/gui/src/shared/ipc.ts and apps/gui/src/main/index.ts: existing create/update transport already carries the model.
- apps/gui/src/renderer/src/components/Settings.tsx and GUI-007 profile files: board-level profile editor is outside this ticket.

## Verification mapping

- Renderer component tests: custom-only visibility, one field per boundary, valid map reaches callbacks, invalid values are blocked, and ordinary profiles remain unchanged.
- Existing profileDraft tests: preserve parser/validator rules and add only ticket-draft coverage if needed.
- Workspace rails: GUI tests, full test suite, all-workspace typecheck, GUI build, diff check; manual Electron visual proof is explicitly INCONCLUSIVE unless a controlled host is available.
