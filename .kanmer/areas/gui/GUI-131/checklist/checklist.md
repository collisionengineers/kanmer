# Checklist — GUI-131

## Planning

- [x] Confirm the differential diagnosis: the clean publisher path has no Electron Vite output because `VERIFY_STEPS` does not build GUI and `--publish` bypasses the preparation-only GUI build.
- [x] Decide and record the ordering contract: publish-mode GUI build must succeed before immutable tag creation and tag push.
- [x] Resolve the non-parked control-flow question in `open-questions`; retain workflow credentials/publishing policy as explicitly deferred.

## Implementation

- [x] Create GUI-131's dedicated branch/worktree from current `origin/main` only after the Preparing → Implementing gate passes: `.worktrees/gui-131` on `gui-131-build-before-tag` at `8a4b7d982b0c94c71a843782d0b6fb1db160025e`.
- [x] Add the existing GUI build command to the publish-mode pre-tag control flow in `scripts/release.mjs`, without adding a second package invocation.
- [x] Add a focused `scripts/release-flow.test.mjs` regression proving the synchronous publish-path GUI build precedes tag creation and tag push.
- [x] Run `node --test scripts/release-flow.test.mjs`: exit 0, 7/7 passing.
- [x] Run `npm run test:scripts`: the first isolated attempt exited 1 only because clean dependencies lacked `packages/core/dist/index.js`; after the explicit core build prerequisite it exited 0, 100/100 passing. Both outcomes are retained in `scratch/execution`.
- [x] Run `npm run typecheck`: exit 0 across all workspaces.
- [x] Commit only the release control-flow and regression-test changes: `4c2d29e62bf74c053a58898ed14d7f06a838a3a8`.
- [x] From a fresh normal GitHub-origin clone of the exact branch head, run `npm run verify`: exit 0 (Core 310/310, GUI 468/468, MCP HTTP 102/102, scripts 100/100, typecheck, docs, smokes, skills, managed AGENTS, and plugin sync).
- [x] Push the branch, open PR [#248](https://github.com/collisionengineers/kanmer/pull/248) with `Kanmer: GUI-131`, record commit/PR traceability and the exact two-file diff.
- [x] Write the post-implementation report and move exactly one stage to Review; report is recorded and GUI-131 is now in Review.
- [x] Resolve independent-review finding REV-001: document the protected-main/local publisher sequence in the human-owned AGENTS.md guidance—GUI build after post-merge preconditions, before tag creation/push; GUI-build failure creates no tag or GitHub Release; managed Kanmer block unchanged.

## Boundaries

- [x] Do not run the release publisher, create/push a tag, publish, or package an installer as part of this remediation.
- [x] Do not change release credentials, workflows/permissions, Electron package configuration, manual upload semantics, or retained v0.3.4/v0.3.5 release records.
- [x] Independent review, merge, merged-main proof, and governed closeout completed.

## Closeout — GUI-131

- [x] PR merge verified (`gh pr view --json state,mergedAt`): [#248](https://github.com/collisionengineers/kanmer/pull/248) is `MERGED` at 2026-08-24T21:52:09Z, merge `3abef518bedbe79647070a84038779644fbc0fa2`.
- [x] proof.md finalised with the PR URL, merge date, exact merged SHA, safe merged-main evidence, and the source-only release boundary.
- [x] Moved to final stage (Done).
- [x] Outcome recorded in ticket body with PR link and [[CORE-098]] successor-release boundary.
- [x] `git worktree remove .worktrees/gui-131` exited 0 and unregistered the worktree. The exact directory retains only ignored `node_modules` with no `.git`; policy rejected recursive deletion, which is recorded in proof.
- [x] Local and remote `gui-131-build-before-tag` branches deleted; local `git branch -d` exited 0 without force.
- [x] `git fetch --prune origin` and `git worktree prune` exited 0; the board worktree was retained.
- [x] Ticket take record released after scoped cleanup.
