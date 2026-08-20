# Files — GUI-101

## Where the change lands

| Path | Why |
|---|---|
| `scripts/check-updater-package.mjs` | Finalize/extend the existing packaged-output gate for the portable launcher: assert unpacked source shim, bundled MCP target, NSIS include/config markers, fixed path/key contract and absence of build-machine paths. Keep one numbered failure list and one exit status. |
| `scripts/check-updater-package.test.mjs` | **Add if no focused test exists.** Build small disposable packaged-output fixtures and prove each launcher/package omission or malformed contract fails with the expected repair text. Do not require a full Electron pack for every script unit test. |
| `apps/gui/src/shared/mcp-sessions.test.ts` | Add a launcher-started process fixture showing the installed `Kanmer.exe ...kanmer-mcp.cjs` child is detected under the install directory while unrelated `cmd.exe` parents are ignored. Modify production session code only if the real process evidence disproves current behavior. |
| `.gitignore` | After—not before—successful two-location packaged proof, remove only `.codex/config.toml` and rewrite the comment to state that Codex project registration is portable/shareable while all other listed Connect artifacts remain machine-local. |
| `apps/gui/src/main/providers.test.ts` | Update the ignore-rule invariant so portable `.codex/config.toml` is the sole Connect-owned config not required to be ignored. Retain every other provider/copy-skills assertion. |
| `docs/functional/frd/FRD-012-connect.md` | Add packaged/real-host acceptance, exact proof fields, shareable-config decision and upgrade/reconnect behavior after the evidence exists. Do not change the registration bytes owned by GUI-100. |
| `docs/functional/frd/FRD-021-auto-update.md` | Record the launcher continuity requirement: update must leave the stable command unchanged, refresh installer-owned resolution safely, and allow a fresh agent session to connect after update. Preserve existing session-stop/update refusal behavior. |
| `apps/gui/release-notes.md` | Explain that users reconnect once to replace old absolute Codex entries, review/commit the now-portable project file, and restart agent sessions after update; other providers do not require migration. |
| `docs/manual/` relevant Connect/update chapter and generated manual output | Add the operator migration and repair path once exact file location is identified. Regenerate through `scripts/build-manual.mjs`; do not hand-edit generated output. |

## Evidence-only artifacts (attach to proof, not source control unless the repository has a designated evidence folder)

| Artifact | Required content |
|---|---|
| Packaged build manifest | Old/new version, tag/commit, installer path, SHA-256, `latest.yml` path/hash and package-check output. |
| Canonical config copies | Byte-identical `.codex/config.toml` from both locations/profiles, SHA-256, trust state and proof that no local path occurs. |
| Installed lifecycle log | Install directory, fixed shim hash, HKCU value, `--probe`, MCP session process chain, update invocation/result and cleanup. Redact user-sensitive paths only in public output while retaining canonical evidence locally. |
| Tool-call log | Before/after-update `get_status` responses showing correct project roots and old/new packaged server identity; no direct memory claim substitutes for raw output. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `MASTERPLAN.md` §6.3 S-25 | Exact scope: installer carries shim, `dist:check` asserts it, and a real packaged registration survives an update. |
| EPIC-011 `context.md` | Portable registration must survive a machine move and app update; GUI-101 proves packaging/update continuity, GUI-102 closes the epic. |
| GUI-099 plan/files/proof | Launcher/NSIS implementation and lifecycle prerequisite. Consume exact installed paths and health contract. |
| GUI-100 plan/files/proof | Canonical registration bytes, probe, migration and non-Codex prerequisite. Do not change the descriptor here. |
| `apps/gui/electron-builder.yml` | Packaged layout, NSIS settings, `extraFiles`/`extraResources` and update feed. Normally already changed by GUI-099. |
| `package.json` and `apps/gui/package.json` | `dist`, `dist:check`, test/manual commands and version identity used in evidence. |
| `scripts/release.mjs` and `scripts/verify-release-assets.mjs` | Publisher/integrity context for obtaining real update assets. Do not change release ownership. |
| `apps/gui/src/main/updater.ts`, `mcp-sessions.ts`, shared parser/tests | Current stop-before-update safety and process identification. Verify the launcher does not bypass it. |
| Archived GUI-094 source docs | Detailed two-location/custom-install proof design; apply only packaging/real-host slice. |

## Ripple effects

- `npm run dist:check` becomes the deterministic pre-release guard for missing portable-launcher inputs.
- `.codex/config.toml` becomes intentionally committable only after evidence; repository/provider tests must encode the exception without weakening other ignores.
- Release/manual guidance gains a one-time reconnect/migration step.
- Update verification must create a new agent host after install; an already-running session may be intentionally stopped by updater safety.
- GUI-102 consumes this proof and should not have to rediscover package layout or registration bytes.

## Out of scope

- Implementing/fixing launcher or registration code except a directly proven regression (return to GUI-099/100 owner if possible).
- Changing release publishing, updater protocol, signing, asset names or other provider configs.
- Editing consumer repositories automatically or committing their configuration.
- Final fresh-install/update/uninstall epic run (GUI-102), remote access or non-Windows packaging.
