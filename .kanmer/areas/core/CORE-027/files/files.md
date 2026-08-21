# Files — CORE-027

## Modify

- `packages/core/package.json` — add the `./browser` import/types export and run the browser artifact guard as part of core build.
- `packages/core/tsup.config.ts` — emit the browser entry separately.
- `packages/core/src/groups.ts` — re-export the extracted pure `deriveMembers` to preserve the root API.
- `packages/ui/src/demo.tsx` — replace mirrored constants/helper with browser-subpath imports and keep the demo document-info fixture current.

## Add

- `packages/core/src/browser.ts` — pure browser public API.
- `packages/core/src/group-members.ts` — pure `deriveMembers` helper.
- `packages/core/scripts/check-browser.mjs` — fails the core build if the browser artifact references Node built-ins.
