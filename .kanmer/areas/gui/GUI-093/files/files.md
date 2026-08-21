# Files — GUI-093

## Where the change lands

| Path | Why |
|---|---|
| scripts/release.mjs | Catch and retain the sole publisher failure, complete local/remote validation, and invoke at most one exact-file remote recovery rather than terminating before verification. |
| scripts/release-publish.mjs *(new)* | Dependency-free, injectable decision helper for publisher-error fall-through and bounded exact-asset recovery, so the critical branches are testable without cutting a release. |
| scripts/release-publish.test.mjs *(new)* | Prove complete-after-error acceptance, incomplete-after-error repair/recheck, failed repair refusal result, and that recovery never invokes Electron Builder/a second package. |
| scripts/verify-release-assets.mjs | Export or reuse the expected local asset names/paths needed to build exact gh release upload --clobber arguments without duplicating the space-to-dash mapping. |
| scripts/verify-release-assets.test.mjs | Extend pure expected-asset coverage only if a new exported upload-argument helper is added. |
| docs/functional/frd/FRD-021-auto-update.md | Amend release-discipline wording only if the existing requirement does not already accurately describe bounded exact-artifact recovery. |

## Context files

| Path | What it tells the implementer |
|---|---|
| apps/gui/electron-builder.yml | The release has one Windows NSIS artifact family and GitHub publishing; it is an input, not a target to change. |
| scripts/check-updater-package.mjs | The local packaged-app rail that must still run after the one package. |
| scripts/verify-release-assets.mjs | The source of truth for version-filtered local assets, manifest coherence, remote asset verification, and GitHub-safe names. |
| scripts/release.mjs | Tag-before-publish ordering and the current one-package/recheck control flow that GUI-093 must extend without reversing. |
| docs/functional/frd/FRD-021-auto-update.md | Governing auto-update/release discipline requirement. |
| [[GUI-092]] | The committed one-package design constraint: remote recovery must not package again. |
| [[GUI-066]] | The original remote-asset verifier and the documented v0.3.3 exact-file manual repair precedent. |

## Ripple effects

- npm run test:scripts must automatically exercise the new dependency-free tests.
- Release dry-run prose and real-release refusal messages must say that a publisher error is verified and, if needed, repaired from the one local package.
- No installer is built, tag pushed, release uploaded, or production release edited in automated ticket verification.

## Out of scope

- A second Electron Builder invocation, changing NSIS targets, version/tag ordering, updater runtime code, or a real release cut.
- Changing GUI-092's one-package invariant or its packaged-app/local-coherence rails.
- Reconstructing old releases such as v0.3.0's accepted missing blockmap.
