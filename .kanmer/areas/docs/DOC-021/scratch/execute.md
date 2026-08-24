## 2026-08-24 — first focused-test attempt

`node --test scripts/release-notes.test.mjs` exited 1 before its assertions because the fresh isolated checkout lacked `packages/core/dist/index.js`, which the release-notes helper imports. `git diff --check` passed and the only changed path was `apps/gui/release-notes.md`. This is retained as an environment/prebuild failure; the planned corrected path is `npm ci --ignore-scripts`, `npm run build:core`, then one focused-test retry.

## 2026-08-24 — corrected focused verification

Installed dependencies with `npm ci --ignore-scripts` (exit 0) and built Core with `npm run build:core` (exit 0), then retried `node --test scripts/release-notes.test.mjs` (exit 0; 1/1 pass). `git diff --check` passed. The only source path changed is `apps/gui/release-notes.md`. The package-manager audit reported existing dependency advisories; no dependency change or audit remediation is in this documentation-only ticket.
