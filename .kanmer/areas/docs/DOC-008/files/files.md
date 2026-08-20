# Files — DOC-008

## Where the change lands

| Path | Why |
|---|---|
| `README.md` | The only file to modify. Replace its format-2 storage tree, example frontmatter, workflow text, old-board upgrade description, and GUI bullets where they make user-facing claims that contradict the shipped format-3 product. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `docs/manual/stages.md` | The exact six-stage order, meanings, and the reason Preparing combines research and planning. |
| `docs/manual/documents.md` | The seven document types, their user-facing descriptions, and the folder-based document model. |
| `docs/manual/settings.md` | Settings exposes areas, profiles, appearance, Git, and Connect; fixed stages and removed priority must not be presented as controls. |
| `docs/manual/profiles.md` | Use profile/gate terminology accurately if README needs to explain why documents vary by ticket. |
| `docs/manual/getting-started.md` | Current concise product overview and vocabulary for source-of-truth, documents, and stages. |
| `packages/core/src/stages.ts` | Shipped source of truth for fixed stage ids/order. |
| `packages/core/src/types.ts` | Format 3 removes statuses and priorities from writable board configuration; legacy fields may appear only for migration reads. |
| `apps/gui/src/renderer/src/components/Settings.tsx` | Confirms the actual Settings surface and Board-tab copy. |
| `apps/gui/src/renderer/src/components/FilterBar.tsx` | Confirms the rendered filter controls contain area, group, assignee, and label—not priority. |
| `packages/mcp-server/src/index.ts` | Shows that the README’s tool count is stale, but this belongs to the excluded manual-MCP/reference section. |

## Ripple effects

- No code, generated artifact, board configuration, or manual chapter should change.
- Re-check every user-facing statement in README’s Kanmer-folder section and Shared board worktree bullets against the manual after editing; a single lingering reference to Impact, priority, editable stages, old stage names, or format-2 migration fails the ticket’s acceptance intent.
- Documentation-only change should receive Markdown/link rendering review. No dedicated README test exists; run the project’s normal relevant verification chosen in planning.

## Out of scope

- Layout, source-development, manual MCP-registration, Verify end-to-end, and Release sections, per ticket scope.
- Changing the in-app manual: DOC-007 already delivered it and it is the source for this correction.
- Removing legacy priority compatibility code or changing board migration behaviour.
- Correcting the stale MCP tool count/list unless a separate ticket is filed; it is outside this ticket’s user-facing README remit.
