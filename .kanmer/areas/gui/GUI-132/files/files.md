# Files — GUI-132

## Change surface

| Path | Role and risk |
|---|---|
| `apps/gui/src/main/connect.ts` | Production Codex launcher preflight. The current `execFile` call crosses the Windows `cmd.exe /s /c` quoting boundary incorrectly. Change only the probe runner/options; preserve failure-before-config behavior. |
| `apps/gui/src/main/providers.ts` | Owns the canonical portable registration and probe command shapes. Preserve the exact rootless registration required by FRD-012 R1e; adjust probe-only quoting only if the real subprocess test proves it necessary. |
| `apps/gui/src/main/connect.test.ts` | Existing injected-runner test proves only the mocked argv. Retain it for contract coverage but add or call a real Windows subprocess test. |
| `apps/gui/src/main/providers.test.ts` | Pure invocation-shape assertions. Update only if the chosen probe-only shape changes. |
| `scripts/kanmer-mcp-launcher.test.mjs` or a focused GUI integration test | Add a Windows-only regression that creates/uses an actual batch launcher and calls the production probe across Node → cmd.exe → .cmd. It must fail on the v0.3.7 implementation and pass after the fix. |

## Ripple effects

- The project `.codex/config.toml` serialization must remain `cmd.exe /d /s /c "\\\"%LOCALAPPDATA%\\Kanmer\\bin\\kanmer-mcp.cmd\\\""` with no absolute install path.
- Connect must still refuse before reading or writing project configuration when the probe fails.
- The fallback text must show a command that actually runs when pasted into Windows PowerShell/cmd.
- Packaged-updater checks rely on the launcher accepting `--probe`; do not modify the launcher protocol.

## Context files

| Path | Why read it |
|---|---|
| `docs/functional/frd/FRD-012-connect.md` | R1e/R1d define the portable launcher and no-absolute-fallback contract. |
| `apps/gui/build/kanmer-mcp.cmd` | Defines the installed launcher and its health-mode output/exit contract. |
| `scripts/check-updater-package.mjs` | Verifies the packaged launcher and must remain compatible. |
| `apps/gui/src/main/connect.test.ts` | Shows the present mocked boundary that allowed the defect through. |

## Deliberately out of scope

Updater replacement/version skew belongs to [[GUI-133]]. Setup-script packaging belongs to [[SKILL-034]]. OpenAI/Cloudflare supervision belongs to [[MCP-049]]. No provider registration format, absolute fallback, or installer behavior changes are authorized here.

## Convention documentation addition

| Path | Role and risk |
|---|---|
| `AGENTS.md` | Required by repository rule 24 because the probe command/process convention changes. Document the probe-only `call` plus `windowsVerbatimArguments` contract and explicitly preserve the persisted rootless registration. |
