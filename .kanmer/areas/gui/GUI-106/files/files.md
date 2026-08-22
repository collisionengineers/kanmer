# GUI-106 files

## Implementation surface

| Path | Change | Risk |
|---|---|---|
| apps/gui/build/kanmer-mcp.cmd | Resolve the stable external runtime target while preserving inherited cwd/stdout/stderr, --probe, exit propagation, and legacy actionable failures. | Quoting/registry mistakes can break every existing Codex registration. |
| apps/gui/build/installer.nsh | Copy Electron runtime prerequisites and standalone bundle into a versioned per-user %LOCALAPPDATA%\Kanmer\mcp directory; activate a stable current boundary atomically; clean only owned stale runtime data on uninstall. | NSIS syntax, locked files, partial copies, update ordering and junction behavior are high risk. |
| apps/gui/electron-builder.yml | Retain install-root legacy payload and package any runtime source files needed by the installer; do not alter GUI-099/100 marketplace or provider registration semantics. | Package omissions only appear in an installer. |
| scripts/check-updater-package.mjs | Add static package assertions for runtime source/payload markers while preserving existing launcher/MCP checks. | Static checks cannot prove a real NSIS update. |
| scripts/kanmer-mcp-launcher.test.mjs | Extend static contract tests for external runtime path, stable boundary, legacy behavior and no cwd/argument forwarding. | Static tests cannot prove a real NSIS update. |
| apps/gui/src/shared/mcp-sessions.ts, apps/gui/src/main/mcp-sessions.ts | Clarify that install-root detection is legacy-only; preserve parsing and stop behavior for old registrations. Add pure coverage for external-vs-legacy paths if required. | Removing the safety net would regress old registrations. |
| apps/gui/src/main/updater.ts | No behavior change expected; retain pre-install stop gate and refusal semantics. Update comments only if needed. | A change here could reintroduce unsafe unattended install. |
| docs/functional/frd/FRD-012-connect.md, docs/functional/frd/FRD-021-auto-update.md, docs/architecture/adr/ADR-0012-board-discovery-order.md | Reconcile runtime/launcher contract and legacy-registration limitation; no provider matrix or discovery-order redesign. | Stale docs would claim all live sessions are stopped or all update proof exists. |
| apps/gui/release-notes.md | State runtime provisioning/one-time migration expectations without claiming real packaged update proof. | User-facing wording must distinguish deterministic package checks from INCONCLUSIVE host evidence. |

## Context files

| Path | Why it matters |
|---|---|
| apps/gui/src/main/connect.ts and providers.ts | GUI-100 fixed launcher invocation and non-Codex provider contracts; do not rewrite provider serialization. |
| apps/gui/src/main/updater.ts | quitAndInstall spawns installer before app quit; all guards remain before that call. |
| apps/gui/src/main/mcp-sessions.ts and apps/gui/src/shared/mcp-sessions.ts | Current path-prefix probe/stop contract and exact legacy safety behavior. |
| apps/gui/build/installer.nsh and electron-builder.yml | GUI-099 ownership/lifecycle and current packaged paths. |
| scripts/check-updater-package.mjs and scripts/kanmer-mcp-launcher.test.mjs | Existing artifact/static rails to extend rather than duplicate. |
| docs/functional/frd/FRD-012-connect.md | Fixed launcher, inherited cwd and rootless Codex registration. |
| docs/functional/frd/FRD-021-auto-update.md | Existing install/session guarantees and the R4 limitation this ticket addresses. |
| docs/architecture/adr/ADR-0012-board-discovery-order.md and ADR-0018 | Discovery and installer-owned launcher contracts; no cwd change. |
| linked GUI-099–GUI-102 and archived MCP-005 packet | Prior decisions, exact runtime evidence, later integration boundaries and unavailable proof limits. |

## Ripple effects and out of scope

The external runtime changes process identity/path and installer-owned files, so package/static checks and legacy session parsing need aligned wording/tests. It does not change MCP server code, provider config serialization, Connect provider selection, remote/tunnel behavior, GUI-101/102 integration execution, or board files. No dependency is needed.
