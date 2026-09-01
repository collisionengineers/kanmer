# Files — GUI-146

| Action | Path | Responsibility |
| --- | --- | --- |
| modify | `apps/gui/src/renderer/src/lib/standup.ts` | line 2: import `isCaptureItem` from `@kanmer/core/browser` instead of `@kanmer/core` |
| modify | `scripts/verify.mjs` | `VERIFY_STEPS`: add `npm run build -w @kanmer/gui` directly after `npm run build` |
| add | `scripts/renderer-core-imports.test.mjs` | node:test guard: every non-test `.ts`/`.tsx` under `apps/gui/src/renderer` may import `@kanmer/core` only as `import type`; runtime imports must use `@kanmer/core/browser` |
| modify | `AGENTS.md` | §6 `npm run verify` row names the GUI build; §7 renderer-import rule names `@kanmer/core/browser` as the runtime entry |

## Read-only context

- `packages/core/src/browser.ts` — the browser-safe entry (`stages`, `profiles`, `deriveMembers`); `isCaptureItem` is in `profiles.ts`, already re-exported. Not modified.
- `packages/core/package.json` `exports["./browser"]` — already present. Not modified.
- `apps/gui/electron.vite.config.ts` — not modified (no aliasing/polyfills).
- `scripts/test-scripts.mjs` — enumerates `scripts/*.test.mjs` automatically, so the new guard needs no registration.
- `scripts/release.mjs` — imports `VERIFY_STEPS`; gains the GUI build in its gate automatically and still runs its own step-6 GUI build afterwards. Not modified.

## Explicitly outside this ticket

`packages/core/src/**`, `apps/gui/src/main/**`, `apps/gui/src/preload/**`, every other renderer file, `plugins/**`, release manifests.
