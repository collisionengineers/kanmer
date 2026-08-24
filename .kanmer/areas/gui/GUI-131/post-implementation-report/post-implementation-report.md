# Post-implementation report — GUI-131

## Result

GUI-131 corrects the source-owned publish ordering gap without changing release credentials, workflow permissions, Electron configuration, or any existing release state.

- PR: [#248](https://github.com/collisionengineers/kanmer/pull/248)
- Branch: `gui-131-build-before-tag`
- Head / commit: `4c2d29e62bf74c053a58898ed14d7f06a838a3a8`
- Base inspected and worktree origin: `origin/main` `8a4b7d982b0c94c71a843782d0b6fb1db160025e`
- PR footer: `Kanmer: GUI-131`

## Implementation

`scripts/release.mjs` now runs the existing `npm run build -w @kanmer/gui` command inside the `publishMode` branch after merged-manifest and release-commit reachability preconditions, but before `git tag` and tag push. Its existing `run()` helper uses synchronous `execSync`, so a failed GUI build stops before an immutable tag, public release, Electron Builder publisher, asset upload, or later publication check.

`scripts/release-flow.test.mjs` adds a focused static control-flow regression. It proves that the exact publish precondition block invokes the GUI build, that this invocation precedes tag creation and tag push, and that `run()` is synchronous. The test does not execute any release command.

The final PR diff contains only:

- `scripts/release.mjs`
- `scripts/release-flow.test.mjs`
- `AGENTS.md` (human-owned contributor guidance only; the managed Kanmer block is unchanged)

`git diff --check origin/main...HEAD` passed and both ticket worktree and normal verification clone were clean after their respective source checks.

## Verification

- `node --test scripts/release-flow.test.mjs`: exit 0, 7/7 passed.
- `npm run test:scripts` in the isolated worktree initially exited 1 because a dependency-only clean checkout lacks the expected `packages/core/dist/index.js` build artifact for two unrelated script tests. This failure is retained in `scratch/execution`. After the explicit `npm run build -w @kanmer/core` prerequisite exited 0, the same rail exited 0, 100/100 passed.
- Isolated all-workspace `npm run typecheck`: exit 0.
- Fresh GitHub-origin normal clone at the exact head: `npm ci --ignore-scripts` exit 0, then `npm run verify` exit 0. The authoritative rail passed Core 310/310, GUI 468/468, MCP HTTP 102/102, script tests 100/100, all-workspace typecheck, docs verification, MCP/headless/protocol/discovery smoke, MCPB check, skills, managed AGENTS block, and plugin sync.

The clean installs reported the existing npm audit advisory count; no dependency change or audit action was taken.

## Release safety boundary

No `release.mjs` invocation, Electron Builder package, tag creation/push, publication, GitHub Release, asset upload, manual repair, credentials change, workflow change, review, or merge occurred. Existing v0.3.4 and v0.3.5 tag/release records were not altered.

At handoff, PR #248 is open at the recorded head. Required `verify` and `kanmer-gate` checks were in progress; independent review owns their terminal assessment, review, merge, and any later publication lifecycle.

## Governing-doc and follow-up status

The implementation meets FRD-021 R3 by ensuring the packaged publisher receives the GUI bundle before it can create an immutable public release identifier. It preserves the existing single direct Electron Builder publisher invocation and all bounded asset-recovery behavior.

No proof was written: proof belongs on merged main. No downstream ticket state was changed.

## Independent-review remediation (REV-001)

Independent review correctly found that the publish-order change establishes a contributor convention and therefore requires AGENTS.md guidance under rule 24. The plan was amended (version `0e763a425d1934f5`), then commit `64fe347143478f4612e18287f94a471f2f8e0d4a` updated only AGENTS.md outside its managed Kanmer block. Its release command reference and protected-main section now state that local `--publish` mode first satisfies merged-manifest and post-merge reachability preconditions, then builds the GUI before it creates or pushes `refs/tags/v<version>`; a GUI-build failure creates neither an immutable tag nor a GitHub Release.

For this documentation-only amendment, `node --test scripts/release-flow.test.mjs` exited 0 (7/7), `npm run test:scripts` exited 0 (100/100), `npm run verify:agents-block` exited 0 (31/31), and `npm run verify:docs` passed. The prior authoritative clean GitHub-origin `npm run verify` evidence remains attached to the source-control head `4c2d29e62bf74c053a58898ed14d7f06a838a3a8`; hosted CI is responsible for the updated PR head. No release operation occurred.
