# Checklist

## Launcher and installer

- [ ] Add `apps/gui/build/kanmer-mcp.cmd` with silent normal startup, HKCU lookup, fixed system `reg.exe`, artifact validation, `--probe`, Electron-as-Node environment, cwd/stdin/stdout/stderr preservation, and child exit propagation.
- [ ] Pin launcher exit 2 for missing install registry value, exit 3 for missing `Kanmer.exe`, exit 4 for missing MCP bundle, and propagated child exits.
- [ ] Add `apps/gui/build/installer.nsh` with atomic `customInstall` shim replacement and HKCU `InstallDir` write.
- [ ] Make `customUnInstall` remove the shim/value only when the recorded install belongs to the uninstalling `$INSTDIR`, preserving newer or unrelated state.
- [ ] Add `extraFiles` and `nsis.include` to `apps/gui/electron-builder.yml` without changing the existing MCP resource layout or custom-install-directory support.

## Provider-specific Connect behavior

- [ ] Rename/preserve the existing installed-Electron invocation for Claude Code, OpenCode, Grok, and Antigravity.
- [ ] Add the exact Codex invocation: `cmd.exe`, args `/d /s /c "\"%LOCALAPPDATA%\Kanmer\bin\kanmer-mcp.cmd\""`, empty env, no `cwd`, `--root`, or `--repo-root`.
- [ ] Make `connectAgent` select invocation by provider while keeping generic serializers and provider ownership unchanged.
- [ ] Run the portable launcher's `--probe` before any Codex config write and return an actionable no-write failure when unhealthy.
- [ ] Make source-launched GUI Codex Connect use a healthy installed launcher or refuse; never write an absolute fallback.
- [ ] Preserve Codex trust notes, atomic TOML merge, reconnect idempotence, disconnect, best-effort legacy removal, skill installation, and dispatch.

## Regression tests

- [ ] Add an exact Codex TOML test proving no machine, repository, board, executable, or bundle absolute path is serialized.
- [ ] Retain TOML unknown-key preservation, byte-stable re-merge, and surgical unmerge tests.
- [ ] Add table-driven tests proving Claude Code, OpenCode, Grok, and Antigravity retain their current invocation/config behavior byte-for-byte.
- [ ] Add probe success/failure tests proving a failed probe cannot create or overwrite `.codex/config.toml`.
- [ ] Add a legacy-sweep regression proving an old rooted global entry becomes drainable when its trusted project has the rootless portable registration.
- [ ] Add a core staleness fixture proving the exact rootless Codex entry is not stale while a wrong explicit root remains stale.
- [ ] Add an MCP-session fixture proving the installed `Kanmer.exe ...kanmer-mcp.cjs` child remains detected and unrelated `cmd.exe` processes do not count.
- [ ] Add Windows launcher tests/static rails for registry key, system helper path, probe, errors, stdout silence, cwd, and exit behavior.

## Packaging and sharing policy

- [ ] Extend `scripts/check-updater-package.mjs` to verify the install-root shim and its contract, while retaining the packaged MCP bundle checks.
- [ ] Remove only `.codex/config.toml` from `.gitignore` after all packaged and two-location proof passes; update comments and the ignore-rule rail.
- [ ] Keep every non-Codex provider registration and copied-skill destination ignored exactly as before.
- [ ] Add the controlled NSIS custom-directory install → probe → upgrade → uninstall lifecycle and record shim/registry ownership evidence.

## Real host proof

- [ ] Create two differently located trusted Git fixtures, each with its own canonical board worktree, and copy one byte-identical portable Codex config to both.
- [ ] Invoke Kanmer `get_status` through a fresh real Codex host in fixture A and capture discovery-based root, board root, repo root, and installed server path.
- [ ] Repeat through fixture B and prove the same config hash resolves fixture B rather than fixture A.
- [ ] Invoke through a linked ticket worktree and prove discovery crosses the worktree `.git` file to the canonical board.
- [ ] Run the missing-shim negative case in a disposable environment and capture the actionable host failure.
- [ ] Run packaged raw JSON-RPC/stdout smoke through the installed shim.

## Governing docs and handoff

- [ ] Amend FRD-012 R1/R1c/R7 and acceptance criteria with the exact portable Windows contract, fixed shim/HKCU lifecycle, provider non-change, dev behavior, and upgrade note.
- [ ] Amend ADR-0012 to name Codex Connect as a rootless discovery consumer without changing discovery order.
- [ ] Create/link a focused launcher ADR if doc review requires the installer-owned shim/HKCU decision to stand alone.
- [ ] Update release notes with reconnect, consumer Git migration, supported-Windows scope, and “other providers unchanged.”
- [ ] Run `npm run test:scripts`, `npm test`, `npm run typecheck`, `npm run dist`, and `npm run dist:check`.
- [ ] Run `git diff --check` and verify the ticket worktree contains no unrelated changes.
- [ ] Write the post-implementation report with exact command outputs, config hashes, both real `get_status` payloads, package/installer evidence, and provider non-regression results.
