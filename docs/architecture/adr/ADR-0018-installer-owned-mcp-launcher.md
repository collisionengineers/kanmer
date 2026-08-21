---
status: accepted
---

# ADR-0018 — The Windows installer owns the stable MCP launcher

- **Status:** accepted
- **Date:** 2026-08-21

## Context

An installed Windows Kanmer application may be repaired, upgraded, or installed
in a different custom directory. A provider registration that embeds
`<InstallDir>\Kanmer.exe` consequently becomes stale even though the same user
still has a healthy Kanmer installation. A launcher must also preserve the
provider workspace as the MCP process cwd: ADR-0012 discovery starts there, not
in the application directory.

The launcher is an installer lifecycle concern, not a provider concern. Its
first consumers are split across GUI-100 through GUI-102, so this decision must
define a stable boundary without changing their registration code.

## Decision

On Windows the per-user NSIS installer owns exactly these stable resources:

- shim: `%LOCALAPPDATA%\Kanmer\bin\kanmer-mcp.cmd`;
- authoritative target: `HKCU\Software\Kanmer` `InstallDir` (`REG_SZ`).

The package carries a static source shim at `<InstallDir>\kanmer-mcp.cmd`.
After the application payload exists, `customInstall` copies it through a
same-directory temporary file and replaces the fixed shim, then writes
`InstallDir`. The shim resolves that exact registry value using
`%SystemRoot%\System32\reg.exe`, validates `<InstallDir>\Kanmer.exe` and
`<InstallDir>\resources\mcp\kanmer-mcp.cjs`, sets `ELECTRON_RUN_AS_NODE=1`
only locally, and directly runs the quoted executable and bundle.

Normal launch accepts no arguments, does not change cwd, does not use `start`,
and leaves stdin/stdout/stderr to the MCP child. It returns the child exit code
unchanged. The sole `--probe` mode validates the resolved targets and emits a
human diagnostic without starting MCP. Missing registry data, executable, bundle
or invalid arguments fail with distinct non-zero launcher exits.

On uninstall, the hook compares the current `InstallDir` to the uninstalling
`$INSTDIR` case-insensitively. Only a matching owner removes the fixed shim and
the `InstallDir` value; it removes parent directories only when empty. An old or
unrelated uninstaller therefore cannot break a newer installation. No HKLM,
PATH, service, native launcher, target-text file, or provider configuration is
part of this decision.

## Consequences

- A registration can later depend on one fixed user-local command instead of a
  versioned or custom application path.
- Upgrade and repair renew the indirection atomically enough that no copied
  partial command file is exposed; incomplete payloads refuse before changing
  the registry target.
- The launcher remains Windows-specific and intentionally has no test-only
  override for its registry key or target.
- GUI-100 owns provider serialization; GUI-101 and GUI-102 own provider and
  host integration proof. This ADR does not claim those behaviours shipped.
- Lifecycle evidence requires a disposable Windows user/VM or a snapshot and
  restoration of existing user state; static/package rails cannot substitute
  for it.

## Alternatives considered

1. **Embed `<InstallDir>` in each provider registration.** Rejected: upgrades
   and custom installation directories leave the registration stale.
2. **Keep a mutable target file beside the registration.** Rejected: it adds a
   second indirection format and no installer ownership/safety boundary.
3. **Find Kanmer through PATH, the current directory, PowerShell, or WScript.**
   Rejected: each is ambient or externally mutable and may change the provider
   cwd or quoting semantics.
4. **Use a native launcher.** Rejected: the fixed batch contract is sufficient,
   auditable, and avoids another toolchain.

Related: FRD-012 · ADR-0012 · MASTERPLAN.md §6.3 S-23 · GUI-099 · GUI-100 ·
GUI-101 · GUI-102.
