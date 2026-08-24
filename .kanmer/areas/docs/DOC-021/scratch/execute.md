## 2026-08-24 — first focused-test attempt

`node --test scripts/release-notes.test.mjs` exited 1 before its assertions because the fresh isolated checkout lacked `packages/core/dist/index.js`, which the release-notes helper imports. `git diff --check` passed and the only changed path was `apps/gui/release-notes.md`. This is retained as an environment/prebuild failure; the planned corrected path is `npm ci --ignore-scripts`, `npm run build:core`, then one focused-test retry.
