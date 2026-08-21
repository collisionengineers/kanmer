# Proof — CORE-027

Verified on merged `main` at `3c1ad6d8a3a1e54c408fd841e20519280790f2c4` (PR #96).

- `npm run build:ui` passed. It rebuilt `@kanmer/core`, emitted `dist/browser.js` and `dist/browser.d.ts`, ran the no-Node-specifier guard, then emitted all UI artifacts.
- `npm run typecheck` passed for core, MCP server, UI, and GUI.
- `npm test -w @kanmer/core` passed: 11 files, 255 tests.
- A direct `import('@kanmer/core/browser')` smoke confirmed stages/profiles and `deriveMembers` are usable; the sample returned one completed member.
- `git diff --check` passed and the merged checkout was clean.

The main checkout required only a local ignored workspace dependency refresh (`npm install --ignore-scripts --package-lock=false`) so Node resolved the newly merged package export; no tracked manifest or lockfile changed.
