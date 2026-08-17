# Files — exact portable Codex MCP registration

## Files to add

| File | Exact responsibility | Verification |
|---|---|---|
| `apps/gui/build/kanmer-mcp.cmd` | Static per-user launcher shim. Read HKCU `Software\Kanmer\InstallDir` with system `reg.exe`; implement `--probe`; validate `Kanmer.exe` and `resources\mcp\kanmer-mcp.cjs`; set `ELECTRON_RUN_AS_NODE=1`; preserve cwd and stdio; return child exit code; errors only on stderr. | Direct probe tests, missing-registry/artifact tests, packaged stdio smoke, cwd/get_status proof. |
| `apps/gui/build/installer.nsh` | Define electron-builder `customInstall` and `customUnInstall`. Copy/remove the fixed LOCALAPPDATA shim and write/remove only Kanmer's HKCU `InstallDir`. Preserve unrelated registry values and directories. | Installer configuration check plus controlled install/upgrade/uninstall lifecycle proof. |
| `scripts/kanmer-mcp-launcher.test.mjs` | Dependency-free tests for the static shim's probe, error codes, stdout cleanliness, cwd preservation, and exit propagation using isolated registry/artifact seams where feasible; platform-gated to Windows. | Included by existing `node --test scripts/*.test.mjs`. |

## Files to modify

| File | Exact change | Provider/risk boundary |
|---|---|---|
| `apps/gui/src/main/connect.ts` | Replace `serverInvocation(boardRoot, sourceRoot)` with provider-aware selection. Codex receives the fixed `cmd.exe` invocation and must pass `--probe` before writing. Every other provider receives the existing Electron/bundle/root invocation. Dev Codex Connect refuses if installed probe fails; it never falls back to absolute TOML. | Highest regression risk: one shared invocation currently serves all providers. Tests pin non-Codex output. |
| `apps/gui/src/main/providers.ts` | Update `Invocation` comments so it is not defined as always Electron + root. Keep serializers generic. Export constants/helper only if needed to keep the portable command string single-source. Do not change provider ownership, config paths, skill installation, or dispatch. | Grok shares TOML serialization with Codex but must not inherit Codex's invocation. |
| `apps/gui/src/main/connect.test.ts` | Test provider-aware selection, exact Codex invocation, packaged/dev probe success/failure, no write on failed probe, and unchanged other-provider invocation. Keep existing registration ownership fixtures. | Use injected executor/path seam rather than launching the real installed app in unit tests. |
| `apps/gui/src/main/providers.test.ts` | Change Codex registration expectations to exact portable shape; retain merge preservation/idempotence/unmerge tests. Add table-driven snapshots for Claude/OpenCode/Grok/Antigravity invocation serialization. Update ignore-rule rail so only `.codex/config.toml` is removed from machine-local config expectations. | Prevents an accidental all-provider migration. |
| `apps/gui/electron-builder.yml` | Add `extraFiles` mapping for `build/kanmer-mcp.cmd -> kanmer-mcp.cmd`; set `nsis.include: build/installer.nsh`. Keep server `extraResources` unchanged. | Custom install directory remains allowed because HKCU points at selected `$INSTDIR`. |
| `scripts/check-updater-package.mjs` | Add package checks for install-root shim, expected launcher contract, and MCP bundle. Update total count/messages. Do not claim unpacked layout proves installer registry lifecycle. | Artifact check only; installed lifecycle proof remains separate. |
| `scripts/check-plugin-sync.mjs` | Only if it currently pins every `extraResources`/manifest entry count; inspect and add no launcher rule unless it owns packaging. Expected no change. | Avoid putting installer checks in plugin ownership rails. |
| `packages/core/src/staleness.ts` tests | Add exact portable Codex TOML fixture proving rootless registration is not stale; keep old wrong-root detection. Production logic already treats null root as discovery-based and likely stays unchanged. | Do not make core depend on TOML parser or installed launcher. |
| `apps/gui/src/shared/mcp-sessions.ts` and tests | Production likely unchanged; add fixture showing a launcher-started child `Kanmer.exe ...kanmer-mcp.cjs` remains detected by install-dir prefix and command line. | Updater restart gate must continue seeing live sessions. |
| `.gitignore` | Remove only `.codex/config.toml` and rewrite the explanatory comment: Codex is portable/shareable; `.mcp.json`, Grok, OpenCode, Antigravity configs and copied skills remain machine-local. | Do not unignore `.codex/` broadly or alter other provider ignores. |
| `docs/functional/frd/FRD-012-connect.md` | Amend R1, R1c, R6/R7 as needed and acceptance criteria: exact portable TOML, fixed shim/registry lifecycle, trusted-project behavior, no root pin, Windows scope, other-provider non-change, and consumer upgrade note. Retain the superseded absolute-path history explicitly. | Governing behavioral contract. |
| `docs/architecture/adr/ADR-0012-board-discovery-order.md` | Add Codex Connect as a deliberate discovery consumer and state that project config omits root flags. Do not change discovery order. | Existing architecture consumed, not redesigned. |
| New ADR under `docs/architecture/adr/` if required by docs review | Record installer-owned fixed shim + HKCU indirection and why relative paths/PATH/native launcher were rejected. Link it to GUI-094 before implementation leaves Preparing. | Durable Windows launcher architecture; preferred rather than hiding it inside FRD prose. |
| `apps/gui/release-notes.md` | At release time, document reconnect requirement and that existing tracked configs need a normal repo commit. | Release process refuses stale notes. |

## Existing files that are evidence/context, not implementation targets

| File | What it proves |
|---|---|
| `C:\Users\PC\Documents\GitHub\pegasus\.codex\config.toml` | Real tracked absolute-path failure. Do not edit from this ticket. |
| `packages/mcp-server/src/root.ts` | Existing discovery and source-root derivation make root flags unnecessary. Expected no production change. |
| `packages/core/src/discover.ts` and tests | Board-worktree lookup and tie-break behavior. Regression dependency, not redesign target. |
| `apps/gui/src/main/mcp-sessions.ts` | Installed session query sees child Electron-as-Node process. |
| `node_modules/app-builder-lib/scheme.json` | Installed builder supports `nsis.include`. |
| `node_modules/app-builder-lib/templates/nsis/installSection.nsh` | `customInstall` runs after app files are installed. |
| `node_modules/app-builder-lib/templates/nsis/uninstaller.nsh` | `customUnInstall` runs before installed files are removed. |
| OpenAI MCP and Configuration Reference | Supported project config and stdio fields; no documented MCP-relative base. |

## Callers and ripple effects

- Settings/Connect UI receives a new actionable preflight failure but the same `ConnectResult` shape.
- Codex trust probing and notes remain unchanged.
- Legacy sweep retains old-global-entry parsing; add a rootless-replacement regression only.
- Repo staleness accepts the new rootless registration already; pin it with a test.
- Updater session detection continues to key on the installed `Kanmer.exe` child.
- Installer, updater packaging rail, release notes, and installed lifecycle gain launcher responsibilities.
- The project configuration becomes intentionally committable on supported Windows machines.
- No plugin manifest, plugin MCP configuration, skill installation destination, dispatch CLI, core storage format, or remote MCP transport changes.

## Deliberately out of scope

- Editing or untracking Pegasus.
- Portable registration for Claude Code, OpenCode, Grok, or Antigravity.
- Restoring Codex plugin-owned MCP.
- macOS/Linux launcher design before Kanmer ships installers for those platforms.
- Changing board discovery order or adding an HTTP MCP server.
- Automatically committing consumer configuration changes.
