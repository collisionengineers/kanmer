# Files — GUI-102

## Expected source changes

This is primarily an integration/evidence ticket. A clean run should require **no production code change** after GUI-099/100/101. Inspect the following exact owners and modify only when the final integrated run exposes a concrete defect that cannot be fixed in its prerequisite ticket:

| Path | Integration responsibility |
|---|---|
| `apps/gui/build/kanmer-mcp.cmd` | Exact fixed launcher bytes, probe, cwd/stdio and child-exit behavior from GUI-099. |
| `apps/gui/build/installer.nsh` | Fresh install, upgrade ownership and uninstall cleanup from GUI-099. |
| `apps/gui/electron-builder.yml` | Packaging of shim, NSIS hook and MCP bundle. |
| `apps/gui/src/main/connect.ts` | Normal Connect/Disconnect flow, probe-before-write, canonical invocation and legacy cleanup from GUI-100. |
| `apps/gui/src/main/providers.ts` | Exact canonical Codex descriptor and surgical TOML merge/unmerge. |
| `apps/gui/src/main/updater.ts` | Real updater entrance and stop-before-install sequencing. |
| `apps/gui/src/main/mcp-sessions.ts` and `apps/gui/src/shared/mcp-sessions.ts` | Detection/stopping of the installed MCP child during update. |
| `scripts/check-updater-package.mjs` | Deterministic launcher/package pre-release gate from GUI-101. |
| `.gitignore` | Post-proof portability decision: Codex project file shareable, other Connect artifacts machine-local. |
| `examples/codex-config.toml` | Exact canonical user-facing registration example. |
| `docs/functional/frd/FRD-012-connect.md` | Complete Connect behavior and migration contract. |
| `docs/functional/frd/FRD-021-auto-update.md` | Stable launcher/update/session continuity contract. |
| `docs/architecture/adr/ADR-0012-board-discovery-order.md` | Cwd/discovery contract exercised from source and linked worktree. |
| GUI-099 launcher ADR | Installer-owned launcher architecture and ownership decision. |
| `apps/gui/release-notes.md` | One-reconnect migration note for existing users. |
| Relevant `docs/manual/` sources and generated manual | Operator install/connect/update/uninstall/repair instructions. |

## Evidence files/records to produce

| Record | Required content |
|---|---|
| `proof/proof.md` | Frontmatter/result bound to the exact merged SHA/environment plus every attempt, commands, outcomes and references to the raw logs. |
| Command log | Pre-state census; install, Connect, tool calls, update, disconnect, uninstall, reinstall and cleanup commands with timestamps/exit codes. |
| Registry/file census | Before/after listings for `%LOCALAPPDATA%\Kanmer`, HKCU Kanmer key, install directory, project config and unrelated sentinel state. |
| Config evidence | Canonical config bytes/hash at registration, after update, after disconnect/reconnect and after reinstall. |
| Tool evidence | Raw `get_status` payloads from source and linked worktree before update, after update and after reinstall. |
| Process/update evidence | MCP process chain, updater stop result, old/new build identity and updater/installer logs. |
| Documentation disposition | Checklist showing migration/manual/release claims exactly match the observed lifecycle. |

## Test fixtures/sentinels

Create only disposable evidence fixtures outside production code:

- Fresh Windows user/VM.
- Repository with canonical `.worktrees/kanmer` board and one linked ticket worktree.
- Unrelated TOML table/server in `.codex/config.toml` to prove surgical merge/unmerge.
- Unrelated file under `%LOCALAPPDATA%\Kanmer` and unrelated registry value under `HKCU\Software\Kanmer` to prove uninstall preservation.
- Controlled old/new package and update feed.

## Out of scope

- New launcher, serializer, updater or provider architecture.
- Automatic consumer Git commits.
- Other providers, non-Windows installers, release signing policy or remote MCP.
- Merging prerequisite PRs or accepting missing prerequisite proof as success.
