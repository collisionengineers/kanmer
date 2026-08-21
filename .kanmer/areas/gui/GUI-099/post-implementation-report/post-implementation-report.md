# Post-implementation report — GUI-099

*Author report before merge; proof remains a post-merge verification artifact.*

## Summary

Added the Windows NSIS-owned, version-independent MCP launcher at %LOCALAPPDATA%\Kanmer\bin\kanmer-mcp.cmd. The installer atomically installs/repairs/upgrades the fixed shim and records the selected complete app directory in HKCU; ownership-aware uninstall preserves a newer installation. The shim validates its targets, supports only --probe, invokes the packaged Electron-as-Node MCP bundle with inherited cwd/std streams, and propagates the child exit code without provider registration changes.

## Changes

| File | Change | Why |
|---|---|---|
| .gitattributes | modified | Keep the Windows launcher CRLF-stable. |
| apps/gui/build/kanmer-mcp.cmd | added | Fixed installer-owned launcher with registry resolution, probe, deterministic failures, and direct stdio launch. |
| apps/gui/build/installer.nsh | added | Atomic per-user install/upgrade and ownership-aware uninstall lifecycle. |
| apps/gui/electron-builder.yml | modified | Ship the shim at install root and include the NSIS lifecycle hooks while retaining the MCP resource mapping. |
| apps/gui/release-notes.md | modified | Document repair/reinstall and the provider-registration boundary. |
| scripts/kanmer-mcp-launcher.test.mjs | added | Dependency-free static contract tests (4/4 pass). |
| scripts/check-updater-package.mjs | modified | Check packed shim, NSIS include, and forbidden launcher behavior (8/8 updater checks pass). |
| docs/architecture/adr/ADR-0018-installer-owned-mcp-launcher.md | added | Record the fixed-shim/HKCU ownership decision and lifecycle/security constraints. |
| docs/functional/frd/FRD-012-connect.md | modified | Specify the Windows per-user launcher contract and boundary. |
| docs/architecture/adr/ADR-0012-board-discovery-order.md | modified | Require inherited cwd/std streams without changing discovery order. |

## Governing docs

FRD-012 now owns the user-facing launcher contract: fixed path, HKCU-selected install, probe/refusal behavior, and Windows/per-user scope. ADR-0012 constrains the consumer launch semantics to preserve the provider workspace cwd and inherited stdio; the discovery order is unchanged. ADR-0018 records why the installer, rather than GUI startup or provider registration, owns the fixed shim and why upgrades publish the target only after payload completion. GUI-100/101/102 provider registration and other-provider work are explicitly outside this diff.

## Risks / follow-ups

Code signing/publisher identity and non-Windows launcher contracts remain parked open questions. Provider serialization/integration remains GUI-100/101/102 scope; this ticket does not claim portable Codex registration is shipped. The first concurrent npm test attempt had three transient core-store ordering failures (timeouts/ENOTEMPTY); the clean authoritative rerun passed all suites and the failure is retained in the checklist/report for reviewer visibility.

## Verification hand-off

On merged main, run npm run verify and npm run dist:check; confirm the packed installer still passes the 8 updater checks. Repeat the controlled Windows fresh-install, different-directory upgrade, incomplete-payload, obsolete-uninstaller, owning-uninstall, and baseline-restoration checks. Verify --probe output is exactly "Kanmer MCP launcher: healthy", normal launch stdout is clean, cwd is unchanged, and the child exit code is exact. No UI screenshot is required for this installer-only change.

## Evidence

- Commits: 0d8c3ecf, dbbdf0fb; PR: #124.
- Source/packed shim SHA256: E1017FA460D5A6B9847E6008A8E2C06A74ECC80C0B09171601631CD26D7E2C41.
- Fresh install and upgrade exit 0; probe exit 0; packaged stdio smoke exit 0 with valid JSON-RPC; fake child exit 23 exact; invalid/missing exits 64/65/66/67; incomplete installer exit 2; obsolete and owning uninstaller checks exit 0.
- Existing app payload and user state restored; final baseline has no fixed shim and no HKCU\Software\Kanmer\InstallDir value.
