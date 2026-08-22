# Files — CORE-042

| Path | Role |
|---|---|
| `scripts/release.mjs` | Split preparation from post-merge publication; eliminate every non-dry-run direct push to protected `main` while preserving the existing verification, packaging, tag, visibility, updater, and asset checks. |
| `scripts/release-flow.mjs` | Dependency-free pure helpers for validated mode/branch/ref decisions and ancestry/manifest contracts, if the existing script boundary needs extraction for deterministic tests. |
| `scripts/release-flow.test.mjs` | Focused node:test coverage for prepare/publish mode validation, protected ref refusal, release-branch naming, and no-publish-before-merge rules. |
| `AGENTS.md` | Update the release command contract and operator sequence because the command now creates a PR before publication. |
| `docs/functional/frd/FRD-021-auto-update.md` | Preserve the R3 release-discipline requirement while documenting the protected-main two-phase boundary. |

## Explicitly unchanged

- `.github/workflows/release.yml` remains tag-triggered, contents-read-only,
  and verification-only.
- `scripts/verify.mjs`, `scripts/verify-release-assets.mjs`,
  `scripts/release-publish.mjs`, package dependencies, board sync, and GUI
  behavior are outside this ticket.
- No GitHub rule, branch protection bypass, tag deletion, release demotion, or
  hosted release is performed by the implementation lane.

## Production caller chain

Operator runs `npm run release -- <version>` → prepare branch/PR → human-approved
merge on GitHub → `npm run release -- <version> --publish` on merged `main`
→ tag/publish → read-only tag verification workflow.
