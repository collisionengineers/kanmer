# Plan — CORE-097

## Governing constraints

- FRD-021's amended protected-main release boundary: the tag workflow is a contents-read-only verifier; `scripts/release.mjs` remains the sole publisher.
- `AGENTS.md` §11: preserve the same non-publishing contract while documenting the corrected package-check command sequence.
- [[CORE-096]] is blocked by this remediation but owns no part of this workflow change.

## Implementation

1. Replace only the **Build and check the packaged updater** workflow command with the existing build/check sequence expressed explicitly:
   - build core and MCP packages;
   - build the GUI;
   - run the GUI distribution command with `--publish never`;
   - run the existing updater-package checker.
   This preserves the artifact inputs and checker used by `npm run dist:check` while passing the flag to Electron Builder rather than to the outer npm script.
2. Keep workflow `permissions: contents: read`, the existing later asset-verifier token mapping, and all tag/retry behavior unchanged. Do not add a credential to the package step.
3. Add a static `node:test` regression in `scripts/release-flow.test.mjs` that asserts the read-only permission, explicit non-publishing package invocation, and absence of a package-step `GH_TOKEN` mapping.
4. Update the release-verification description in `AGENTS.md` to name the explicit non-publishing packaging sequence without changing the documented local-publisher ownership.

## Validation

- `node --test scripts/release-flow.test.mjs`
- `npm run test:scripts`
- From the ticket worktree, run the exact non-publishing package sequence and `node scripts/check-updater-package.mjs`; inspect the Electron Builder output for the non-publishing policy and absence of an upload attempt.
- `npm run verify` from a clean GitHub-origin normal clone of the committed head.
- Push the branch and record GitHub PR check/security results. Do not create, replay, or retag a release workflow run.
