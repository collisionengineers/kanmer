# Research — GUI-131: v0.3.4 packaged Electron entry

## Question

Did the v0.3.4 tag workflow omit the configured Electron main entry `out/main/index.js` from `app.asar`, and if so which packaging-only configuration change repairs it?

## Findings

- GitHub Actions run `32764694871` (tag `v0.3.4`, commit `102ba3b120cc3065943089d122a6172de8934ece`) logged Electron Vite producing `out/main/index.js` in both its GUI build and its distribution build.
- The same hosted log completed Electron Builder packaging, NSIS installer construction, block-map generation, and signing stages. It contains no missing-`app.asar` or missing-`out/main/index.js` error.
- That run failed only when Electron Builder attempted implicit tag-based publishing: `GitHub Personal Access Token is not set ... GH_TOKEN`. The workflow's package step does not provide `GH_TOKEN`; its later release-asset verification step would have provided `github.token`, but was skipped after the package step failed.
- A clean local package at the same commit succeeded: `npm run dist -w @kanmer/gui` exited 0, then `node scripts/check-updater-package.mjs` exited 0 with `updater package OK (8 checks)`.
- Directly parsing the generated `apps/gui/release/win-unpacked/resources/app.asar` header at that commit found `out/main/index.js` present.
- `apps/gui/electron-builder.yml` already includes `out/**/*`; the current packed artifact demonstrates that this includes the configured Electron main entry.

## Implications

The asserted packaging-inclusion defect is disproven by both the hosted log and a clean artifact inspection. A packaging-only source change would not repair the observed failure and would falsely claim a missing-entry fix. The remaining release-token/implicit-publish behavior is expressly outside this ticket's scope, which prohibits changing release workflow or semantics. The existing `v0.3.4` tag remains public while no GitHub Release exists; any authorized replacement-publication decision belongs to the release work, not this ticket.

## Open questions

- None for the packaging-inclusion scope. Whether to change the tag-workflow publisher credentials or publication semantics is an out-of-scope release decision requiring a separately scoped ticket/authorization.

## 2026-08-24 reopened differential diagnosis — v0.3.4 clean package vs v0.3.5 publisher

### Question

Why did the clean v0.3.4 package include `out/main/index.js`, while the one authorized v0.3.5 local publisher from clean merged main created an `app.asar` without that entry?

### Findings

- The former passing clean package used `npm run dist -w @kanmer/gui`; its unchanged script is `electron-vite build && electron-builder --win`. Electron Vite therefore creates `apps/gui/out/main/index.js` before Electron Builder reads the `files: out/**/*` rule.
- The v0.3.5 canonical publisher executed the shared `VERIFY_STEPS` first. Those start with root `npm run build`, which builds only core and MCP server; they run GUI tests but never `electron-vite build`.
- In `scripts/release.mjs`, the only `npm run build -w @kanmer/gui` is inside `if (!publishMode)`, the release-preparation branch. The `--publish` branch skips it, pushes the tag, then directly runs `npx electron-builder --win --publish always`.
- The exact clean v0.3.5 publisher clone at `8a4b7d982b0c94c71a843782d0b6fb1db160025e` had no `apps/gui/out` directory immediately before that direct Builder invocation. The directory is ignored and no `apps/gui/out` files are tracked.
- Read-only inspection of the incomplete failed artifact succeeded: `app.asar` had 303 entries, no `/out/` entries, and no `/out/main/index.js`. This is consistent with Builder receiving no GUI bundle, not with it excluding a bundle that existed.
- The relevant Electron Builder and Electron Vite configuration, and `scripts/release.mjs`, are byte-equivalent between the v0.3.4 commit `102ba3b120cc3065943089d122a6172de8934ece` and the v0.3.5 publisher target. The source difference is the execution path, not a new inclusion-rule regression.
- The v0.3.5 tag workflow explicitly runs the GUI build before its non-publishing package invocation. That protects the workflow path but does not supply the missing build in the local `--publish` publisher path.

### Implication

The source-owned defect is a release-publisher control-flow gap: `--publish` invokes Electron Builder without first creating the GUI bundle. A future remediation should make the canonical publisher build the GUI before packaging while preserving the single-package and no-manual-repair policies. It must not weaken `app.asar` validation or alter release credentials/workflow semantics to disguise this failure.
