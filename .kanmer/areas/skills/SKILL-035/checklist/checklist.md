# Checklist

- [x] Amend verify guidance with retryable and explicitly disposed terminal paths.
- [x] Add archived-Verifying cleanup to closeout guidance.
- [x] Route auto's failed-verification stop to the explicit disposition path.
- [x] Amend FRD-007 and FRD-015 without adding a stage or success state.
- [x] Update the canonical managed AGENTS rule and refresh `AGENTS.md`.
- [x] Add semantic prose regression checks.
- [x] Run focused and authoritative verification commands with exit codes.
- [x] Write the post-implementation report, commit, push, open PR, and move to Review.

## Verification attempts

- First `node scripts/verify-skill-prose.mjs`: exit 1; three new assertions were line-wrap-sensitive. Corrected the assertions without weakening their semantic requirements.
- First `node scripts/verify-agents-block.mjs`: exit 1; exposed that `scripts/agents-block-body.mjs` is canonical and the setup skill fence had drifted from it. Updated the actual source and refreshed AGENTS.
- Second focused runs: both exit 0.
- First `npm run verify`: exit 1 at final `plugin:check` after all preceding checks passed; packaged setup runtime copy was stale.
- `npm run plugin:build` then `npm run plugin:check`: exit 0.
- Second complete `npm run verify`: exit 0.
