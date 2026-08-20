# Research — GUI-099 installer-owned launcher shim

## Problem

Provider registrations that point directly to a packaged executable or generated MCP bundle are coupled to the current installation directory. They become stale when Kanmer is updated into a different application directory, reinstalled for another Windows user, or restored on another machine. Application code cannot reliably repair those registrations before the provider tries to launch them.

The stable contract must therefore be owned by the installer and live outside the replaceable application payload. Provider registrations invoke the stable launcher contract; the launcher resolves the current installed Kanmer target at runtime.

## Version-1 platform decision

The current packaged desktop/Connect release is Windows-first. Use an installer-owned command shim at a stable per-user location:

```text
%LOCALAPPDATA%\Kanmer\bin\kanmer-mcp.cmd
%LOCALAPPDATA%\Kanmer\bin\kanmer-mcp-target.txt
```

Provider registrations do **not** embed a username-specific expanded path. They invoke the Windows command processor explicitly and retain `%LOCALAPPDATA%` for runtime expansion:

```text
command: cmd.exe
args:
  - /d
  - /s
  - /c
  - '"%LOCALAPPDATA%\Kanmer\bin\kanmer-mcp.cmd"'
```

The exact JSON/TOML representation differs by host, but the executable and logical argv are canonical and generated from one shared launcher descriptor. GUI-100/101/102 own provider serialization and real-host verification; this ticket owns the installed launcher contract and its tests.

A compiled native launcher may supersede the command shim in a future ADR, but adding a compiler/runtime/toolchain or committed opaque binary is not justified for v1. The fixed script accepts no arbitrary caller arguments, uses only Windows built-ins, inherits stdio, and delegates to one installer-written absolute target.

## Shim behavior

The script must be static, installer-owned, and free of user/provider input. It:

1. disables command echo and delayed expansion;
2. resolves its own directory (`%~dp0`);
3. reads exactly the first line of `kanmer-mcp-target.txt` without executing its contents;
4. rejects missing/empty/multiline/control-character/oversized target data;
5. requires an absolute existing regular `.exe` path under the current installer-owned Kanmer installation root;
6. invokes the target quoted with the fixed internal argument that starts the packaged stdio MCP mode;
7. inherits stdin/stdout/stderr and waits for completion;
8. returns the child's exact exit code;
9. writes no normal output of its own; deterministic startup errors go to stderr and have stable non-zero codes.

Do not forward `%*` or provider-supplied arbitrary arguments. The MCP target and mode are fixed by the installer contract. This prevents a registration or caller from broadening the command into arbitrary app execution.

## Target file contract

`kanmer-mcp-target.txt` is installer/update-owned state, not user settings. It contains one absolute Windows path plus a final CRLF. It must not contain quotes, environment references, arguments, tabs, additional lines, NUL/control characters, relative components, UNC/network paths, or shell syntax.

The installer/update flow writes it transactionally:

1. validate the final installed executable exists;
2. create a same-directory temporary file with restricted user permissions;
3. write the canonical absolute executable path and flush/close;
4. atomically replace the target file;
5. execute the launcher self-test and stdio discovery smoke;
6. only then declare the installed launcher healthy.

A failed update must leave the previous valid target file and application version launchable. Never point the stable shim at a staging or partially installed directory.

## Installation and ownership

- Per-user installations own `%LOCALAPPDATA%\Kanmer\bin`.
- The installer creates/repairs the directory, static shim, and target file.
- The application may **inspect** launcher health and request installer/repair operations, but it must not silently rewrite installer-owned bytes during normal GUI startup.
- Updates replace the target transactionally after the new application is complete.
- Uninstall removes files only when their content/ownership marker belongs to that installation and no newer/current installation owns them.
- Reinstall/repair recreates missing or stale files deterministically.
- Moving/copying the application directory manually is not treated as a successful install; doctor/Connect reports stale target and directs the user to repair/reinstall.

The stable directory should include a small non-secret ownership/version marker if the installer framework needs to distinguish Kanmer-managed files from unrelated user content. Do not delete the whole parent directory recursively.

## Packaged target

The target must be a shipped executable mode that runs the canonical MCP stdio server without opening the GUI or contaminating protocol stdout. Prefer one existing packaged CLI/launcher entry already used by provider Connect. If the current GUI executable cannot run a clean headless stdio mode, expose a packaged child executable/entry through the existing build before wiring the shim; do not point the script to source files, workspace `node_modules`, or a versioned development path.

The child contract must preserve:

- one canonical tool registry and current tool count/schema;
- project/root selection through existing environment/config contract;
- stdout reserved for MCP protocol;
- logs/errors on stderr;
- signal and child-exit propagation;
- no requirement for a globally installed Node runtime;
- no board/repository mutation merely by startup.

## Portability properties

- **Application update:** installer updates only the target file after the new target is healthy; provider registration is unchanged.
- **Reinstall to another directory:** installer rewrites target; registration is unchanged.
- **Different Windows username/machine:** provider registration contains `%LOCALAPPDATA%`, not an expanded user path; installing Kanmer creates the same relative shim contract.
- **Copied provider registration:** works only after Kanmer is installed/repaired on the destination machine, which is an explicit prerequisite.
- **Application move without installer:** fails safely and is repaired through installer/Connect diagnostics rather than launching an unknown path.

## Security and quoting

A batch shim is safe only if its data boundary is narrow:

- invoke `cmd.exe` explicitly; do not rely on providers guessing how to execute `.cmd` files;
- use fixed `/d /s /c` arguments and one tested quoting representation;
- disable AutoRun with `/d`;
- quote the shim and target paths;
- disable delayed expansion before reading a target that could contain `!`;
- accept no arbitrary arguments, command fragments, or user-selected environment variable names;
- validate installer target before writing it and validate again in the self-test/helper;
- do not use `start`, which detaches and breaks stdio/exit propagation;
- do not use PowerShell, WScript, PATH search, registry command parsing, symlinks/junctions, network paths, or current working directory as target discovery.

Tests must include spaces, parentheses, ampersands, exclamation marks, percent signs, Unicode, and long but valid paths. Malicious target-file fixtures must fail before child execution and must not create a marker file.

## Health and diagnostics

Expose one pure/shared launcher descriptor and one health checker that GUI-100/101 can consume:

- expected shim/target/marker paths;
- expected static shim content hash/schema version;
- target parse result and canonical executable path;
- target existence and package/version identity;
- self-test/spawn result;
- stable states `healthy`, `missing`, `stale`, `invalid`, `unlaunchable`, `unsupported`;
- safe repair action (`repair installation` or rerun current installer), never direct untrusted rewrite.

Health output excludes user document paths, board content, provider config, and secrets. It may report a redacted/canonical launcher path for local diagnostics.

## Tests

Required tests use a disposable `%LOCALAPPDATA%` override/test root and fake packaged target executable/script:

- fresh install, repair, update target, rollback after failed update, uninstall ownership;
- canonical command/argv and environment expansion;
- stdio byte forwarding, stderr separation, exact exit propagation, signal/termination behavior;
- missing/empty/multiline/relative/UNC/quoted/control/oversized/wrong-extension/nonexistent/outside-install target refusal;
- path metacharacters/Unicode/length;
- malicious target cannot execute a marker command;
- no arbitrary caller args forwarded;
- old registration launches the new target after update;
- copied canonical registration resolves under a different test `%LOCALAPPDATA%` root after installation;
- concurrent repair/update/read cannot expose a partial target;
- normal GUI/root verification and packaged real-host smoke.

## Non-goals

- No POSIX launcher in v1, PATH mutation, App Execution Alias, Windows service, shell extension, registry App Paths dependency, automatic app relocation, provider registration changes, Codex-specific serialization, or direct source checkout execution.

## Correction — authoritative discovery contract

The earlier “target file” proposal above is **superseded and must not be implemented**. The adopted ticket, MASTERPLAN S-23, ADR-0012 context, EPIC-011 approval contract, and archived GUI-094 source plan all fix the v1 design as:

```text
%LOCALAPPDATA%\Kanmer\bin\kanmer-mcp.cmd
HKCU\Software\Kanmer\InstallDir = <selected per-user install directory>
```

The shim queries the exact HKCU value with `%SystemRoot%\System32\reg.exe`, validates `<InstallDir>\Kanmer.exe` and `<InstallDir>\resources\mcp\kanmer-mcp.cjs`, sets `ELECTRON_RUN_AS_NODE=1`, directly invokes the packaged bundle through the installed Electron executable, preserves the caller’s current working directory and stdio, and returns the child exit code. There is **no** `kanmer-mcp-target.txt` file, no alternate target-file parser, no target-file ownership marker, and no application-startup rewrite path.

The installer lifecycle is the ownership boundary:

- `customInstall` runs after app files exist, atomically copies the static shim to the fixed LOCALAPPDATA path and writes the HKCU `InstallDir` value.
- Upgrade/reinstall repeats those idempotent operations after the new install payload is complete.
- `customUnInstall` removes the shim/value only when the recorded `InstallDir` equals the uninstalling `$INSTDIR`; an obsolete installation must not remove a newer installation’s launcher.
- Parent directories are removed only when empty; unrelated registry values/files are preserved.
- Normal GUI startup may diagnose the launcher but does not silently rewrite installer-owned state.

Security/quoting decisions retained from the earlier research still apply where compatible: explicit `cmd.exe /d /s /c`, no `start`, no cwd change, no PATH search, no arbitrary caller argument forwarding, no stdout wrapper chatter, quoted paths, and real tests for spaces/metacharacters. Any section above that refers to a target text file, transactionally replacing that file, parsing its contents, or using it as the source of truth is withdrawn.

## Corrected implementation implications

- Add `apps/gui/build/kanmer-mcp.cmd` and `apps/gui/build/installer.nsh`.
- Package the source shim into the install payload through `apps/gui/electron-builder.yml`; the NSIS hook copies it to the fixed per-user launcher location.
- Extend `scripts/check-updater-package.mjs` to prove the packaged inputs and NSIS include are present, but use a controlled real installer lifecycle for HKCU/install/uninstall behavior.
- Do not modify provider registration serialization in this ticket; GUI-100 consumes the stable launcher contract.
- Do not add a native launcher, target file, service, PATH mutation, App Execution Alias, PowerShell wrapper, registry command string, or cross-platform shim.
