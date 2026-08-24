## Implementation and validation — 2026-08-24

- Replaced only the tag workflow's aggregate package command with the equivalent build, GUI build, GUI distribution (explicit `--publish never`), and existing updater-package checker sequence.
- Kept `contents: read`, the asset verifier's existing token mapping, trigger, and retry loop unchanged. No secret, credential mapping, permission elevation, tag, release, or asset write was performed.
- Added static regression coverage in `scripts/release-flow.test.mjs` and updated the contributor instruction because the workflow command sequence changed.

### Local attempts

1. Isolated install: `npm --prefix <ticket-worktree> ci --ignore-scripts` exited 0 (npm reported existing dependency advisories; no dependency change made).
2. Focused `node --test scripts/release-flow.test.mjs`: first attempt failed only because the new assertion expected eight rather than ten YAML indentation spaces; corrected the test. Rerun passed 6/6.
3. `npm run test:scripts`: first attempt failed before the core build because `scripts/auto-run-state.test.mjs` and `release-notes.test.mjs` import `packages/core/dist/index.js`. After the prescribed `npm run build`, rerun passed 99/99.
4. Exact standard GUI distribution invocation with `--publish never` exited 1 because Windows reported `EBUSY` while replacing the ignored `apps/gui/release/win-unpacked` directory. This did not reach publishing and did not alter source.
5. Documented alternate-output retry: GUI build plus Electron Builder `--win --publish never --config.directories.output=release-core097` exited 0; `node scripts/check-updater-package.mjs --out apps/gui/release-core097` passed all 8 checks. Electron Builder output showed the explicit `--publish never` command and no upload task.

Pending: commit the reviewed diff and run the clean GitHub-origin normal-clone `npm run verify` at that exact commit.
