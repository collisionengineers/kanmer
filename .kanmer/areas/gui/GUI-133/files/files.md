# Files — GUI-133

## Production

- `apps/gui/build/installer.nsh` — add the supported `customCheckAppRunning` override using `Win32_Process.ExecutablePath`, bounded retries, graceful then forced termination, and fail-closed refusal.
- `apps/gui/electron-builder.yml` — only if packaging configuration must expose a test resource; otherwise unchanged.
- `apps/gui/src/main/updater.ts` — retain the existing unsaved/session gate; change only if evidence shows the app-driven path needs coordination with the installer override.
- `scripts/check-updater-package.mjs` — assert the packed installer contract is sourced from the fixed process predicate.
- `AGENTS.md` — replace the incorrect `Path`-predicate description with the actual override and atomic-install invariant.

## Tests and evidence

- `scripts/check-updater-package.test.mjs` and/or a focused dependency-free installer-contract test — reject `Win32_Process.Path`, require `ExecutablePath`, exact path-boundary matching, fail-closed enumeration/clearance, and pre-uninstall hook wiring.
- Existing GUI updater/session tests — regression rail.
- Packaged artifacts under `apps/gui/release/` are generated and not committed.
- Ticket proof records the real two-version install/reinstall matrix and exact file/process evidence.

## Governing/reference inputs

- `docs/functional/frd/FRD-021-auto-update.md`
- Electron Builder's bundled 26.0.12 NSIS templates under `node_modules/app-builder-lib/templates/nsis/` (read-only dependency evidence)
- Official Electron Builder NSIS customization documentation and upstream installer template.
