# Post-implementation report — DOC-025

## Changed

Added the v0.3.8 top section to `apps/gui/release-notes.md`. It describes only merged release, gate, remote-access, and supported-provider behaviour. It explicitly leaves public tunnel availability as user configuration and does not claim Antigravity background dispatch.

## Verification

- `npm run build:core`: exit 0.
- `node --test scripts/release-notes.test.mjs`: exit 0; 1/1 passed.
- `git diff --check`: exit 0.

The initial release-notes test invocation failed because the new ticket worktree had no built `packages/core/dist/index.js`; building core resolved that declared test prerequisite without source changes.
