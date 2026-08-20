# Open questions — GUI-099

The archived GUI-094 work, adopted MASTERPLAN and EPIC-011 approval contract resolve the launcher design. The incorrect target-file alternative in the first research draft is explicitly superseded.

- [x] **What is the stable launcher path?** — `%LOCALAPPDATA%\Kanmer\bin\kanmer-mcp.cmd`, retained literally in provider configuration so the destination user's environment expands it.
- [x] **How does the shim find the selected install directory?** — Query exact value `HKCU\Software\Kanmer\InstallDir` with `%SystemRoot%\System32\reg.exe`. No target text file or PATH search.
- [x] **What child is launched?** — `<InstallDir>\Kanmer.exe` with `ELECTRON_RUN_AS_NODE=1` and `<InstallDir>\resources\mcp\kanmer-mcp.cjs`, using the existing packaged stdio-server contract.
- [x] **How is the provider workspace preserved?** — The shim never calls `cd`, never uses `start`, and directly invokes the child with inherited cwd and stdio.
- [x] **What arguments may callers supply?** — Only the installer-owned `--probe` mode is recognized for health checks. Normal provider calls forward no arbitrary `%*` arguments.
- [x] **Who may create or rewrite the launcher?** — The per-user installer/upgrade/repair path only. Normal GUI startup diagnoses but does not silently rewrite installer-owned state.
- [x] **How is upgrade made safe?** — Install payload completes first; `customInstall` then atomically replaces the fixed shim and writes HKCU to the complete `$INSTDIR`. Provider registration remains unchanged.
- [x] **How is uninstall ownership decided?** — Remove the shim/value only when recorded `InstallDir` equals the uninstalling `$INSTDIR`; remove parent keys/directories only when empty.
- [x] **What if the launcher is absent or invalid?** — Probe/Connect fails with an actionable repair/reinstall message. There is no machine-specific registration fallback.
- [x] **Is v1 cross-platform?** — No. It is explicitly Windows/per-user/NSIS. Other platforms require a measured installer and a separate ADR/ticket.
- [x] **Is a native launcher required?** — No. The fixed batch shim is sufficient and avoids a new compiler/binary/toolchain. Reconsider only after an observed batch limitation.
- [x] **How is the architecture documented?** — Amend FRD-012 and ADR-0012 and add the next numbered focused launcher ADR (expected ADR-0018 after the MASTERPLAN's 0016/0017 sequence).
- [x] **How is behavior tested without weakening production?** — Static/script tests and package checks run normally; HKCU install/upgrade/uninstall behavior is proven in a disposable or fully snapshotted Windows user profile. Do not add a production test override that lets untrusted callers select an install directory.

## Parked (explicitly deferred)

- [ ] **Code signing and publisher identity** — safe to defer because this ticket does not change executable signing or updater signature policy. Reopen when the signing story is implemented or electron-builder's major-version behavior changes.
- [ ] **macOS/Linux launcher contracts** — safe to defer because Kanmer currently ships a Windows NSIS installer and the approved epic is Windows-specific. Reopen when a supported non-Windows installer exists.
