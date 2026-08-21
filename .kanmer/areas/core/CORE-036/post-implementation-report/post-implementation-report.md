# Post-implementation report — CORE-036

## Delivered

- Added .github/workflows/release.yml with one stable release-verify job on v* tag pushes, windows-latest, bash shell, finite timeout, read-only contents permission, tag-scoped concurrency, tagged checkout, Node 20/npm ci, strict package/plugin version validation, npm run verify, npm run dist:check, and bounded read-only release-asset polling.
- Updated AGENTS.md command and release guidance to describe the workflow path, stable check name, read-only validator role, and local release.mjs publisher ownership.

## Governing documents

- MASTERPLAN.md S-20 and Appendix A: met — the workflow calls the existing verification/package/asset tools and does not duplicate or publish.
- AGENTS.md release rules: met — operational truth now names the tag trigger, release-verify check, publisher/validator split, and read-only permissions.
- No PRD/FRD/ADR is linked; this is an operational release rail over existing behavior.

## Validation

- git diff --check — exit 0.
- npm run verify — exit 0 on the implementation branch; build, core 256, GUI 338, HTTP/protocol/discovery/scripting/skills/agents/plugin rails completed.
- npm run dist:check — exit 0 on the implementation branch; packaged Windows installer and updater-package checks completed.

## External evidence disposition

- The next real v<semver> tag green Actions run and the deliberately incomplete disposable-release red run were not fabricated or simulated. They require external GitHub release/tag state beyond local source checks; the checklist leaves those exact boxes unchecked. The workflow is intentionally ready for those runs and will fail visibly on missing/incomplete assets.

## Review handoff

The branch is ready for independent review. Do not claim CI green or negative release proof until an actual Actions run produces it; no publish/repair command was added.
