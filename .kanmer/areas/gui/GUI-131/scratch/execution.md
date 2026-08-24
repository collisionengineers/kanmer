## Implementation and verification — 2026-08-24

- Worktree/branch: `.worktrees/gui-131` / `gui-131-build-before-tag`, created clean from `origin/main` `8a4b7d982b0c94c71a843782d0b6fb1db160025e`.
- Commit `4c2d29e62bf74c053a58898ed14d7f06a838a3a8` changes only `scripts/release.mjs` and `scripts/release-flow.test.mjs`. The publish branch now synchronously runs the existing GUI build after merged-manifest/reachability checks and before `git tag` / tag push. The regression asserts this publish-block ordering and `execSync`-backed wait.
- Focused `node --test scripts/release-flow.test.mjs`: exit 0, 7/7.
- Isolated `npm run test:scripts` initial attempt: exit 1. `auto-run-state.test.mjs` and `release-notes.test.mjs` could not import the expected clean-worktree build artifact `packages/core/dist/index.js`; no source assertion failed. After `npm run build -w @kanmer/core` exit 0, the same script rail exited 0, 100/100. The initial failure is preserved, not erased.
- Isolated all-workspace `npm run typecheck`: exit 0.
- Fresh GitHub-origin normal clone at the exact commit ran `npm ci --ignore-scripts` then `npm run verify`: exit 0; Core 310/310, GUI 468/468, MCP HTTP 102/102, scripts 100/100, typecheck, docs, smoke, MCPB/protocol/discovery, skills, managed AGENTS, and plugin sync all passed.
- Pushed branch and opened https://github.com/collisionengineers/kanmer/pull/248 with the `Kanmer: GUI-131` footer. `git diff --check origin/main...HEAD` passed; diff is exactly the two planned files.
- No `release.mjs`, Electron Builder package, tag creation/push, publication, GitHub Release, asset upload, credential/workflow change, self-review, or merge occurred.

## Review-handoff CI snapshot

Post-move read-only GitHub status for PR #248 at `4c2d29e62bf74c053a58898ed14d7f06a838a3a8`: the PR is OPEN and merge state is BLOCKED. Required `verify` remains IN_PROGRESS; `kanmer-gate` completed FAILURE at 2026-08-24T21:39:31Z. This is handoff evidence for an independent reviewer. No rerun, source change, self-review, merge, tag, package, publication, or release-state change was performed.
