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
