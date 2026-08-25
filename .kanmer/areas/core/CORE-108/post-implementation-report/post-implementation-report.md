# Post-implementation report

## Change

The release publisher now captures the numeric GitHub database ID of the draft it just created and passes that identity into strict pre-publication verification. `fetchReleaseAssets` and `verifyRelease` accept an optional positive safe-integer `releaseId`; with it they use `GET /repos/{owner}/{repo}/releases/{id}`, while public/tag verification retains the existing tag endpoint.

The release script validates the captured ID before upload/verification and refuses without publishing if GitHub returns an invalid identity. A review finding also corrected 404 diagnostics so the by-ID path reports an inaccessible release ID instead of falsely claiming that a tag is absent. Asset derivation, required names, uploaded state, sizes, SHA-256 digests, manifest SHA-512, and public remote-coherence checks are unchanged.

## Verification

- Focused release-flow and verifier tests after review remediation: 62/62 PASS.
- Full script suite after build: 115/115 PASS before review remediation; the focused affected suite passed again afterward.
- Workspace typecheck: PASS.
- Live authenticated check of failed draft release id 376364285 through the new by-ID route: exit 0, four canonical assets, zero problems.
- The first ad-hoc live wrapper returned the same zero-problem result but then forced `process.exit()` and triggered a Windows libuv assertion while HTTP cleanup was closing; the graceful-exit rerun passed with exit 0.
- An initial `npm run test:scripts` before building failed because `packages/core/dist/index.js` did not exist in the fresh worktree. `npm run build` then the unchanged suite passed 115/115; no assertion was weakened.
- Existing npm audit state remains 13 vulnerabilities (4 low, 4 moderate, 4 high, 1 critical); no dependency changed.

## Production caller

`scripts/release.mjs` is the production caller. It captures the ID immediately after `gh release create --draft` and supplies it only to the draft verification call. The standalone verifier and tag workflow remain tag/public based.
