# Post-implementation report — GUI-132

## Result

Implemented the Windows Codex launcher probe correction on branch `gui-132-codex-probe-quoting`, commit `d731c982`, PR #256.

## Changes

- `apps/gui/src/main/providers.ts`: changed only the probe invocation to `cmd.exe /d /s /c call "%LOCALAPPDATA%\\Kanmer\\bin\\kanmer-mcp.cmd" --probe`; the persisted rootless registration is unchanged.
- `apps/gui/src/main/connect.ts`: gives cmd ownership of its embedded quotes with `windowsVerbatimArguments: true` and emits a directly pasteable fallback rather than backslash-escaped quotes.
- `apps/gui/src/main/connect.test.ts`: adds a real Windows Node → cmd.exe → temporary batch launcher regression and pins the displayed command.
- `apps/gui/src/main/providers.test.ts`: pins the probe-only invocation shape.
- `AGENTS.md`: documents the new probe convention as required for command/convention changes.

## Preserved failures

1. The first focused-test command used the wrong workspace-relative filter and exited 1 with no tests found.
2. After dependency/core setup, the unmodified v0.3.7 production code failed the real subprocess regression with the quoted launcher reported as not recognized—the same defect shown by the installed app.
3. The first `call` attempt without verbatim Windows arguments also failed because Node still emitted literal escaped quotes.

## Verification

- Focused Connect/provider tests: exit 0, 102/102.
- GUI typecheck: exit 0.
- Full GUI suite: exit 0, 49 files and 469/469 tests.
- `git diff --check`: exit 0.
- Scoped diff: five authorized files; no dependencies, registration ownership, launcher batch, updater, or remote-access changes.

## Governing-doc alignment

FRD-012 R1e/R1d remains intact: the installed portable launcher is probed before project config mutation, no absolute-path fallback exists, failures remain actionable, and the project registration stays rootless.

## Verification handoff

After merge, run the focused real-process test on exact merged main, build/package the GUI, install the candidate over an older build, click Codex Connect, and confirm the real installed launcher probe succeeds before the project config is written. Retain any installed-runtime failure as FAIL; source tests alone do not prove the packaged path.
