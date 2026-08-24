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
