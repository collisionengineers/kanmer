# Files

- `scripts/release.mjs` — capture the numeric ID of the draft just created and pass it to strict pre-publication verification.
- `scripts/verify-release-assets.mjs` — accept an optional numeric release identity and use GitHub's draft-capable release-by-id REST route.
- `scripts/verify-release-assets.test.mjs` — prove tag lookup remains the public default and numeric ID lookup carries authentication and validates the same asset shape.
- `scripts/test-scripts.mjs` — only if the release source contract assertion requires the new identity handoff.
