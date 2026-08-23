# Plan

1. Search the full bundled skill tree and current verification tests for the exact stale legacy-asset claim and nearby obsolete review instructions.
2. Update only the contradictory prose to describe the current review scratch file and asset set; preserve all valid review handoff/gate language.
3. Add or adjust a focused prose assertion that fails if the deleted-asset claim returns.
4. Run the focused skill-prose tests and `npm run plugin:check`; inspect the diff for scope and record results in the post-implementation report.

## Risks and rollback

- The skill tree is bundled into plugin artifacts; do not regenerate unrelated artifacts unless the existing plugin rail requires it.
- If a reference is intentionally historical, preserve it only with an explicit label that cannot be mistaken for current procedure.
- Rollback is a single prose/test revert.
