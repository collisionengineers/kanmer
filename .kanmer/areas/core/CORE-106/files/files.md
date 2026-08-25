# Files and impact

## Change files

| Path | Responsibility and risk |
|---|---|
| `scripts/release.mjs` | Replace Electron Builder publication with package-once plus explicit GitHub release creation/upload. Highest risk: public tag/release partial state and recovery behavior. |
| `scripts/verify-release-assets.mjs` | Add strict self-contained public-release coherence verification that does not depend on independently rebuilt signed bytes. Risk: false green if manifest-to-installer linkage is incomplete. |
| `scripts/verify-release-assets.test.mjs` | Pin missing/duplicate assets, wrong version/URL/size/SHA-512, absent digest, and valid remote set. |
| `scripts/release-publish.mjs` and tests | Reconcile or remove repair logic made obsolete by explicit single-owner upload; preserve one bounded repair path only if it consumes the same package generation. |
| `.github/workflows/release.yml` | Invoke remote-coherence mode after local source/package checks; stop presenting the workflow rebuild as the public artifact reference. |
| `CLOSEOUT_PLAN.md` | Replace stale v0.3.8 assumptions with the actual partial-release disposition and v0.3.9 sequence. |
| `AGENTS.md` | Update if the release command/convention changes in a contributor-visible way, per repository rule 24. |

## Context files

| Path | Why read it |
|---|---|
| `apps/gui/electron-builder.yml` | Defines artifact names, update metadata, and GitHub provider configuration. |
| `scripts/check-updater-package.mjs` | Defines local packaged-updater coherence and must remain intact. |
| `scripts/release-flow.mjs` | Defines protected-main prepare/publish phase and tag invariants. |
| `docs/functional/frd/FRD-021-auto-update.md` | Governs updater and publication end state. |
| `apps/gui/src/main/connect.ts` | Confirms the Codex probe fix is already on main and only awaits release. |
| Tickets CORE-036, CORE-042, CORE-103 | Preserve earlier failures and required closeout evidence. |

## Ripple effects
The updater consumes `latest.yml`; GitHub Releases feeds installed clients; the tag workflow supplies post-publication evidence; release notes and MCPB must be in the same public set. No runtime API or dependency changes are required.

## Out of scope
No new updater UI, fallback publisher, alternate hosting provider, retagging of v0.3.8, weakening of digest checks, Cloudflare product change, or OpenAI tunnel feature work.
