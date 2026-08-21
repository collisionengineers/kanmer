# Implementation report — CORE-027

## Delivered

- Added `@kanmer/core/browser`, emitted as its own `dist/browser.js` and declaration entry.
- Moved `deriveMembers` to `group-members.ts`; `groups.ts` re-exports it so the root API remains compatible.
- Replaced the UI demo's mirrored stages/profile constants and membership helper with browser-subpath imports.
- Added `scripts/check-browser.mjs`, run by the core build, to reject emitted Node built-in specifiers.
- Updated the demo document-info response with the current `TicketDocsInfo` fields so UI declaration generation succeeds.

## Validation

- `npm run build:ui` — passes; browser bundle and UI artifacts emitted.
- `npm run typecheck` — passes across core, MCP server, UI, and GUI.
- `npm test -w @kanmer/core` — 255 tests passed.
- Direct `@kanmer/core/browser` import smoke passed, including `deriveMembers`.
- `git diff --check` — passes.

## Worktree dependency note

The linked worktree initially resolved `@kanmer/core` from the main checkout's shared `node_modules`, whose package manifest predated this subpath. A local `npm install --ignore-scripts --package-lock=false` in `.worktrees/core-027` created a worktree-local workspace junction and changed no tracked manifest or lockfile. The UI build then exercised the newly exported subpath successfully.

## Traceability

- Commit: `050877d1328b5a9cc0209edbfb37851bf66ccf70`
- PR: #96
