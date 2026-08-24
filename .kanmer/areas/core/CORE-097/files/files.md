# Files — CORE-097

## Modified

- `.github/workflows/release.yml` — replace the tag job's aggregate `npm run dist:check` invocation with its equivalent package-build/check sequence, passing `--publish never` only to the GUI Electron Builder invocation.
- `scripts/release-flow.test.mjs` — add a dependency-free static regression test for the release-workflow boundary: read-only permission remains, the package step passes `--publish never`, and that step has no publisher token mapping.
- `AGENTS.md` — update the documented tag-verification command sequence because the workflow no longer invokes the aggregate `dist:check` command; preserve the existing statement that CI is contents-read-only and local release code is the sole publisher.

## Read only / intentionally unchanged

- `apps/gui/electron-builder.yml` — retained GitHub updater-feed configuration; changing it would alter GUI packaging.
- `apps/gui/package.json`, root `package.json` — local package and release commands remain unchanged.
- `scripts/release.mjs` and `scripts/release-publish.mjs` — local post-merge publishing/repair remains the sole publisher.
- `docs/functional/frd/FRD-021-auto-update.md` — its read-only tag-verifier boundary remains accurate.
- `CORE-096`, `GUI-131`, tag `v0.3.4`, and release assets — outside scope.
