# Plan — GUI-099: Installer-owned launcher shim and its lifecycle

## Objective

Create the stable Windows launcher contract that later Portable Codex Connect tickets can depend on: an installer-owned `%LOCALAPPDATA%\Kanmer\bin\kanmer-mcp.cmd` that resolves the current per-user Kanmer installation from HKCU, starts the packaged stdio MCP server without changing the provider's workspace cwd, survives upgrades/custom install directories, and is removed safely on uninstall.

## Starting state

- Codex Connect currently serializes a machine-specific installed Electron/MCP path.
- The packaged MCP bundle already lives at `<InstallDir>\resources\mcp\kanmer-mcp.cjs` and is launched through `Kanmer.exe` with `ELECTRON_RUN_AS_NODE=1`.
- electron-builder uses per-user NSIS installation, allows a custom install directory, and has no custom launcher lifecycle.
- ADR-0012 discovery can locate the correct source/board worktree from provider cwd; changing cwd to the install directory would break that contract.
- The archived GUI-094 research/plan is the detailed source material. EPIC-011 splits it: this ticket ends at a healthy installer-owned launcher and does not edit provider registration.
- A partial research draft proposed a target text file. That proposal is superseded; HKCU `Software\Kanmer\InstallDir` is authoritative.

## Approach

Ship one static batch shim as an installer resource and own its lifecycle through electron-builder NSIS hooks. The shim uses only fixed Windows built-ins and a single HKCU value, validates the installed executable and MCP bundle, preserves cwd/stdio, and forwards the child exit code. This is simpler and more portable than embedding install paths, safer than PATH/current-directory lookup, and avoids a native launcher toolchain. Installer hooks—rather than normal app startup—are the only writers, giving upgrade/uninstall a deterministic ownership boundary.

## Governing docs

- **EPIC-011 `context.md` — Meets.** Produces the version-independent installer-owned shim required for byte-identical registrations; does not absorb registration or integration tickets.
- **MASTERPLAN.md §6.3 S-23 — Meets.** Exact fixed path, installer creation/update/removal, HKCU resolution and cwd preservation are implemented and proven.
- **`docs/functional/frd/FRD-012-connect.md` — Modifies with explicit roadmap authorization.** Add the launcher prerequisite/lifecycle and distinguish it from GUI-100's Codex serialization.
- **`docs/architecture/adr/ADR-0012-board-discovery-order.md` — Meets and amends consumer notes.** Preserve discovery order; state that launcher wrappers must inherit provider cwd.
- **New `ADR-0018-installer-owned-mcp-launcher.md` — New ADR.** Record the durable indirection/ownership decision after ADR-0016/0017; allocate the next free number if those documents land differently.
- Clear `docs_todo` and link the new ADR before leaving Preparing/entering implementation review.

## Required changes

### 1. Freeze the launcher contract in documentation/tests

1. Add the focused launcher ADR with context, decision, exact paths/key, lifecycle, security properties, rejected alternatives and consequences.
2. Amend FRD-012 so supported Windows Connect implementations may depend on the fixed launcher but cannot embed the selected install directory.
3. Amend ADR-0012 to name inherited cwd as a requirement for this launcher consumer; do not alter precedence or tie-break rules.
4. Link the new ADR to GUI-099 and set `docs_todo: false` after the document exists.
5. Define constants in tests/comments only once:
   - shim path: `%LOCALAPPDATA%\Kanmer\bin\kanmer-mcp.cmd`;
   - registry key/value: `HKCU\Software\Kanmer` / `InstallDir`;
   - installed executable: `Kanmer.exe`;
   - MCP bundle: `resources\mcp\kanmer-mcp.cjs`.

### 2. Add the static shim

6. Create `apps/gui/build/kanmer-mcp.cmd` with CRLF line endings appropriate to a Windows command file.
7. Start with `@echo off`, `setlocal DisableDelayedExpansion`, and no banner/output in normal mode.
8. Recognize either no arguments (normal stdio launch) or exactly `--probe`; reject all other arguments with a stable non-zero exit and stderr message.
9. Resolve `reg.exe` through `%SystemRoot%\System32\reg.exe`; do not use PATH, PowerShell, WScript or a repository helper.
10. Query exact HKCU value `Software\Kanmer\InstallDir` and parse only the final value field expected from `reg query`.
11. Refuse missing, empty or malformed registry output without attempting a child launch.
12. Construct quoted absolute paths for `<InstallDir>\Kanmer.exe` and `<InstallDir>\resources\mcp\kanmer-mcp.cjs`.
13. Use `if exist` checks for both targets and distinct deterministic launcher exits/messages:
    - install registry missing/invalid;
    - `Kanmer.exe` missing;
    - MCP bundle missing;
    - invalid caller arguments.
14. In `--probe`, validate both targets, print one concise diagnostic to stdout (safe because this mode is not MCP protocol), and exit 0 without starting the server.
15. In normal mode, set `ELECTRON_RUN_AS_NODE=1` in the local environment and directly invoke the quoted executable with the quoted bundle path.
16. Do not call `cd`, `pushd`, `start`, `call` on arbitrary text, or expand `%*` into the child command.
17. Capture `%ERRORLEVEL%`, end the local environment while retaining the numeric value, and exit with the exact child code.
18. Keep normal wrapper stdout/stderr empty unless launcher validation fails; after child start, the child owns protocol stdout and diagnostic stderr.
19. Add comments documenting why `/d /s /c`, inherited cwd and no arbitrary argument forwarding are load-bearing for GUI-100.

### 3. Add NSIS ownership hooks

20. Create `apps/gui/build/installer.nsh` using electron-builder's supported `customInstall` and `customUnInstall` macros.
21. In `customInstall`, run only after `$INSTDIR` payload files exist.
22. Validate the packaged source shim exists at `$INSTDIR\kanmer-mcp.cmd`; abort/refuse rather than writing a registry value for an incomplete install.
23. Create `$LOCALAPPDATA\Kanmer\bin` without deleting or replacing the parent tree.
24. Copy the source shim to a same-directory temporary filename, then rename/replace the final `kanmer-mcp.cmd` so readers never observe partial bytes.
25. Write `HKCU\Software\Kanmer\InstallDir` as `REG_SZ $INSTDIR` only after the final target files and shim exist.
26. Make install/repair/upgrade idempotent: repeating the hook with the same `$INSTDIR` produces the same bytes/value.
27. In `customUnInstall`, read the current `InstallDir` value first.
28. Compare the recorded canonical path to the uninstalling `$INSTDIR` using an NSIS-safe case-insensitive Windows path comparison.
29. If they differ or the value is absent, leave the shared shim and registry value untouched; an obsolete uninstall must not damage the current installation.
30. If they match, delete only the known fixed shim and the `InstallDir` value.
31. Remove `HKCU\Software\Kanmer` only if it contains no remaining values/subkeys; preserve unrelated future/user values.
32. Remove `bin` and `Kanmer` directories only if empty; never recursively delete `%LOCALAPPDATA%\Kanmer`.
33. Keep `perMachine: false`; do not write HKLM, another user's profile or PATH.

### 4. Wire packaging

34. In `apps/gui/electron-builder.yml`, add `extraFiles` mapping `build/kanmer-mcp.cmd` to install-root `kanmer-mcp.cmd`.
35. Add `nsis.include: build/installer.nsh` while retaining `oneClick`, `perMachine`, custom-install-directory and shortcut settings.
36. Keep the existing MCP bundle `extraResources` mapping unchanged.
37. Do not package a target text file, native launcher, duplicate MCP bundle or source-checkout script.
38. Confirm the unpacked package contains both the source shim and canonical MCP bundle at the paths the installer hook/script expects.

### 5. Add deterministic rails

39. Add `scripts/kanmer-mcp-launcher.test.mjs` under the existing Node test runner.
40. Add static assertions for the exact fixed path/key, system `reg.exe`, disabled delayed expansion, probe branch, `ELECTRON_RUN_AS_NODE`, resource path, no `cd`/`start`, no arbitrary `%*`, and child exit propagation.
41. On Windows in a disposable/snapshotted user context, exercise probe and normal launch against a controlled installation path containing spaces, parentheses, ampersand, exclamation mark, percent and Unicode where cmd semantics permit.
42. Assert normal wrapper startup emits no wrapper bytes before the MCP child protocol output.
43. Assert a controlled child exit code returns unchanged through the shim.
44. Assert missing registry, missing executable and missing bundle produce distinct non-zero exits and stderr, with no child marker executed.
45. Do not add an environment/CLI override that lets production callers choose another registry key or install target solely for tests.
46. Extend `scripts/check-updater-package.mjs` to assert:
    - install-root source shim exists;
    - expected static contract markers exist;
    - no build-machine absolute path exists;
    - NSIS include is configured;
    - packaged MCP bundle still exists.
47. Keep plugin checks and MCP tool-reference unchanged; the tool surface does not change.

### 6. Prove the installer lifecycle

48. Build a packaged installer with `npm run dist:check` in a controlled Windows environment.
49. Snapshot any existing `HKCU\Software\Kanmer` values and fixed shim before destructive lifecycle testing, or use a disposable Windows user/VM.
50. Fresh-install to an explicit custom directory and assert:
    - `$LOCALAPPDATA\Kanmer\bin\kanmer-mcp.cmd` exists and matches expected bytes;
    - HKCU points to the selected directory;
    - `--probe` succeeds;
    - cwd before/after probe/normal launch is unchanged.
51. Install/upgrade a newer build to a different custom directory and assert the same provider command resolves the new HKCU target without changing the fixed path.
52. Simulate/perform a failed or incomplete update before `customInstall`; assert the previous shim/HKCU target remains healthy.
53. Run the old/unrelated uninstaller after a newer installation and assert it does not remove the current shim/value.
54. Uninstall the current owning installation and assert the owned shim/value are removed, unrelated files/registry values remain, and only empty parent directories disappear.
55. Restore any snapshotted user state and record cleanup.

### 7. Close documentation/release boundary

56. Update release notes to say the installer now owns a stable launcher and repair/reinstall restores it. Do not claim portable Codex registration until GUI-100/101/102 ship.
57. Run document numbering/structure checks and regenerate only through the approved generator; do not hand-edit `docs/contributing/doc-structure.md`.
58. Record exact installed paths, registry before/after, shim hash, probe output, cwd, child exit and cleanup in the post-implementation report.
59. Stop before modifying provider configuration or starting GUI-100.

## Expected files

Add:
- `apps/gui/build/kanmer-mcp.cmd`
- `apps/gui/build/installer.nsh`
- `scripts/kanmer-mcp-launcher.test.mjs`
- `docs/architecture/adr/ADR-0018-installer-owned-mcp-launcher.md` (or next free number)

Modify:
- `apps/gui/electron-builder.yml`
- `scripts/check-updater-package.mjs`
- `docs/functional/frd/FRD-012-connect.md`
- `docs/architecture/adr/ADR-0012-board-discovery-order.md`
- `apps/gui/release-notes.md`

## Do not modify

- `apps/gui/src/main/connect.ts`, `providers.ts`, Codex TOML merge/cleanup, `.gitignore` or other providers (GUI-100).
- Provider packaging/integration proof beyond the launcher lifecycle (GUI-101/102).
- MCP tool registry, protocol, storage, remote transport or discovery order.
- PATH, HKLM, services, app aliases, a native launcher or a target text file.
- `docs/contributing/doc-structure.md` by hand.

## Acceptance checks

- Fixed shim path and HKCU contract match MASTERPLAN/source material exactly.
- The shim preserves cwd and stdio, emits no normal wrapper output and propagates child exit status.
- Missing/invalid installation state fails safely and actionably without launching arbitrary content.
- Custom per-user install, repair and upgrade create/refresh the launcher idempotently.
- A newer installation cannot have its launcher removed by an older uninstaller.
- Owning uninstall removes only Kanmer-owned bytes/value and preserves unrelated state.
- The packaged app contains the source shim and bundled MCP at expected paths.
- `dist:check`, script tests, GUI/core tests, typecheck and document checks pass.
- FRD/ADR accurately state the launcher architecture and cwd dependency; new ADR is linked and `docs_todo` cleared.
- No provider registration or unrelated provider behavior changes in the diff.

## Verification commands

```bash
npm run test:scripts
npm test
npm run typecheck
npm run dist:check
npm run check:manual
node scripts/check-doc-numbering.mjs
git diff --check
git status --short
```

Controlled Windows lifecycle evidence:

```text
fresh custom install → probe → normal stdio launch/cwd/exit proof
upgrade to different directory → unchanged fixed shim command resolves new target
old uninstaller → current launcher survives
owning uninstall → owned shim/value removed; unrelated state preserved
```

## Failure and deviation rules

- If electron-builder's NSIS hook order differs from the inspected version, stop and update the design/ADR before writing unsafe hooks.
- If batch quoting cannot safely handle a supported install path, report the exact failing path and stop; do not silently restrict install directories or add PowerShell/PATH fallback.
- If a test requires weakening the fixed registry/argument boundary, use a disposable Windows user/VM instead.
- If the packaged Electron-as-Node target cannot start the canonical stdio server cleanly, file/report that prerequisite; do not create a second server implementation.
- If provider code appears necessary, stop at the documented launcher API and hand off to GUI-100.
- Do not merge or begin GUI-100.

## Stop condition

Stop when the installer-owned shim, NSIS lifecycle, package rail and governing docs are complete; controlled evidence proves fresh install, custom-directory upgrade, cwd/stdio/exit preservation, old-uninstaller safety and owning uninstall cleanup; all deterministic commands pass; and the PR is ready for independent review. Do not edit provider registrations, merge the PR or start GUI-100.
