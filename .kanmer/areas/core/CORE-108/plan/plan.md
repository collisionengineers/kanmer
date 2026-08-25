# Plan

1. Add an optional `releaseId` to `fetchReleaseAssets` and `verifyRelease`; validate it as a positive integer and select `/repos/{owner}/{repo}/releases/{id}` only when supplied. Keep tag lookup unchanged for public verification.
2. After `gh release create --draft`, resolve the newly created release's numeric database ID through authenticated `gh release view`, validate the captured value, and pass it to draft verification.
3. Add regression tests for the exact by-id URL, auth header, malformed IDs, and propagation from `verifyRelease`; retain all existing 404/auth/rate-limit semantics.
4. Run focused release/verifier tests, script tests, then repository verification. Open and independently review a protected PR before merging.
5. Preserve v0.3.9 unchanged. After the fix merges, prepare and publish v0.3.10 through the corrected path.
