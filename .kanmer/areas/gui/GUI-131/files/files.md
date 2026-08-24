# Files — GUI-131

## Where the change lands

No product files are truthfully in scope: the claimed `app.asar` entry omission does not occur in the hosted or clean local package.

| Path | Why |
|---|---|
| _None_ | No packaging-inclusion repair is warranted by the recorded evidence. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `apps/gui/electron-builder.yml` | Its `files: out/**/*` rule is the inclusion rule under investigation; the inspected artifact proves it contains `out/main/index.js`. |
| `apps/gui/package.json` | Electron's configured main entry is `./out/main/index.js`; its `dist` command runs Electron Vite before Electron Builder. |
| `apps/gui/electron.vite.config.ts` | The main Rollup input is `src/main/index.ts`, producing the expected `out/main/index.js`. |
| `scripts/check-updater-package.mjs` | The existing post-package rail validates eight updater/package contracts; it passed against the clean artifact. |
| `.github/workflows/release.yml` | The hosted tag workflow runs `npm run dist:check` without `GH_TOKEN`; its failed log identifies implicit publishing authentication, not app-asar content. |
| `scripts/release.mjs` | The authorized publication path separately invokes Electron Builder with `--publish always` and token checks; changing it is outside GUI-131. |

## Ripple effects

No code or test modification is justified. The durable evidence is the failed hosted run `32764694871`, the clean local exit-zero package/check, and direct Asar-header inspection. A release follow-up must preserve the existing `v0.3.4` tag and not pretend a release was published.

## Out of scope

- Release-workflow credentials, tag-trigger behavior, or implicit-publish semantics.
- Retagging, publication, uploading assets, or editing any existing release.
- CORE-096 and any unrelated source/test changes.

## 2026-08-24 reopened differential scope

| Path | Why it is now in scope | Risk / required evidence |
|---|---|---|
| `scripts/release.mjs` | Its `--publish` branch tags and calls Electron Builder but bypasses the GUI-build command that exists only in preparation mode. | Preserve release ordering and the one-package/asset-verification policy; prove a clean publisher input contains the generated GUI entry before Builder runs. |
| `scripts/release-notes.test.mjs` or the existing release-script test suite | The release control-flow contract needs a focused regression assertion. | Test source/order behavior without a real tag, publish, credential, or package run. |
| `apps/gui/package.json` | Defines the already-correct `build` and `dist` commands that distinguish the passing path. | Context only unless a focused test needs to reference the command; do not change the package command or Builder config without separate evidence. |
| `scripts/verify.mjs` | Explains why the shared verification rail leaves a clean clone with no GUI bundle. | Context only; it must remain the shared verification rail and is not the missing-build caller. |
| `apps/gui/electron-builder.yml` | Confirms `files: out/**/*` is correct once the bundle exists. | Context only; do not weaken the files rule or add a fallback. |
| `.github/workflows/release.yml` | The tag workflow explicitly builds GUI before non-publishing packaging, proving a different path already has the prerequisite. | Explicitly out of scope: no workflow/credential/publishing-semantics change in GUI-131. |

### Ripple and non-scope boundary

The remediation is a publisher-path build prerequisite, not an Electron Builder inclusion repair. It cannot repair the already-pushed immutable v0.3.4 or v0.3.5 tags, create a release, upload assets, or rerun packaging. Any successor release remains a separately authorized lifecycle.
