# 2026-08-24 — reopened v0.3.5 publisher differential diagnostics

All diagnostics were read-only and ran in the exact clean publisher clone at `8a4b7d982b0c94c71a843782d0b6fb1db160025e`; no source, tag, release, publish, package, or retry command was run.

| Diagnostic | Exit | Exact result |
|---|---:|---|
| `git diff --quiet 102ba3b120cc3065943089d122a6172de8934ece 8a4b7d982b0c94c71a843782d0b6fb1db160025e -- scripts/release.mjs apps/gui/electron-builder.yml apps/gui/electron.vite.config.ts` | 0 | The publisher control source and packaging configuration are identical at the formerly clean-package commit and the failing publisher target. |
| `git diff --name-status ... -- apps/gui/electron-builder.yml apps/gui/package.json apps/gui/electron.vite.config.ts scripts/release.mjs .github/workflows/release.yml package.json` | 0 | Only `.github/workflows/release.yml`, `apps/gui/package.json`, and `package.json` differ; package scripts remain `build = electron-vite build` and `dist = electron-vite build && electron-builder --win`. |
| source read of `scripts/verify.mjs` | 0 | `VERIFY_STEPS` starts with root `npm run build`, which builds core and MCP server only; it has no GUI build. |
| source read of `scripts/release.mjs` | 0 | GUI build at line 420 is inside `if (!publishMode)`; publish path tags at line 445 then calls direct Builder at line 456. |
| `Test-Path apps/gui/out/main/index.js`; Asar listing via `@electron/asar` | 0 | Before/after the failed publisher path: `apps/gui/out` absent; failed `app.asar` exists with 303 entries, `ASAR_MAIN_PRESENT=false`, and no `/out/` entries. |
| `git ls-tree -r --name-only HEAD -- apps/gui/out`; `git check-ignore -v apps/gui/out/main/index.js` | 0 / 0 | No tracked GUI build output; `.gitignore:16` ignores `apps/gui/out/`. |
| `git status --short` | 0 | No tracked source changes in the diagnostic clone. |

Root-cause hypothesis (confirmed by these facts): the local `--publish` release path calls Electron Builder without building Electron Vite output. The passing v0.3.4 clean package and non-publishing tag workflow both build GUI first. The missing Asar entry is therefore an absent build input, not a broken `files: out/**/*` inclusion rule.

The v0.3.5 publisher’s original failure remains preserved in [[CORE-098]]; no repair/retry was attempted here.
