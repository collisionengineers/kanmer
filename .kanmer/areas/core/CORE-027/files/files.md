# Files — CORE-027

## Modify

- packages/core/package.json — add ./browser import/types export.
- packages/core/tsup.config.ts — emit browser entry.
- packages/core/src/groups.ts — consume extracted pure deriveMembers.
- packages/ui/src/demo.tsx — replace mirrored constants and helper with browser subpath imports.
- package.json or core tests — add browser artifact guard to existing rail.

## Add

- packages/core/src/browser.ts — pure browser public API.
- packages/core/src/group-members.ts — pure deriveMembers helper.
- packages/core/src/browser.test.ts — browser export/build guard.
