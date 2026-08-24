# Post-implementation report — DOC-021

## Delivered

- Changed only apps/gui/release-notes.md.
- Promoted the accumulating top section to 0.3.4 while retaining the verified post-v0.3.3 user-facing changes.
- Added bounded wording for project-declared source preferences and Windows connection/remote-access resilience.
- Inserted the 0.3.3 heading before previously shipped notes.

## Traceability

- Branch: DOC-021-release-notes
- Commit: 3921d90f4a613d4a6b2037dc5833df5cdad6a8a6
- Pull request: #242

## Verification

- First focused release-notes test: exit 1 because the new isolated checkout lacked packages/core/dist/index.js; retained in scratch as a prebuild environment failure.
- npm ci --ignore-scripts: exit 0.
- npm run build:core: exit 0.
- node --test scripts/release-notes.test.mjs: exit 0 (1/1 pass).
- git diff --check: exit 0.
- Final diff path census: apps/gui/release-notes.md only.

## Scope and handoff

No release tag, generated release artifact, manifest, CI, provider configuration, branch protection, or root-checkout file changed. PR #242 is open; hosted verify and kanmer-gate were queued when recorded. Stop for independent review and normal protected-main merge. CORE-096 remains blocked until the resulting merge SHA is recorded.
