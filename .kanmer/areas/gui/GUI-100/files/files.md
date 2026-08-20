# Files — GUI-100

## Where the change lands

| Path | Why |
|---|---|
| `apps/gui/src/main/providers.ts` | Generalize `Invocation` comments; define/export the canonical immutable Codex launcher invocation (and probe command fragment if kept pure here); make TOML serialization omit `env` when empty; leave Grok and all provider ownership/config/install/dispatch definitions unchanged. |
| `apps/gui/src/main/connect.ts` | Select invocation by provider; retain the existing installed Electron/root-pinned invocation for every non-Codex host; preflight the fixed Codex shim with `--probe` before reading/writing project TOML; refuse without absolute fallback; keep trust note, atomic merge, legacy cleanup and half-success reporting. |
| `apps/gui/src/main/providers.test.ts` | Assert the exact portable `[mcp_servers.kanmer]` shape, byte-identical output for different simulated roots/users/install locations, conditional empty-env omission, idempotent merge, surgical unmerge, machine-specific-entry replacement, and unchanged non-Codex provider fixtures. |
| `apps/gui/src/main/connect.test.ts` | Test provider-aware invocation selection, successful/failed launcher probe, zero-byte/no-config mutation on probe failure, no fallback, preserved trust note, reconnect idempotence, project-entry replacement, legacy global cleanup and unchanged other-provider connect commands. |
| `packages/core/src/staleness.test.ts` | Add exact rootless portable Codex TOML and assert it is not reported behind; retain wrong explicit-root detection. Production `staleness.ts` is expected to remain unchanged. |
| `examples/codex-config.toml` | Replace source-checkout/Node/cwd examples with the exact installed portable project registration and installation/trust/repair prerequisites. Do not suggest combining plugin and manual registration. |
| `docs/functional/frd/FRD-012-connect.md` | Add the exact Codex project TOML, probe-before-write, rootless discovery, reconnect/drain/disconnect behavior, trust prerequisite, supported-Windows boundary and explicit non-change for other providers. |
| `docs/architecture/adr/ADR-0012-board-discovery-order.md` | Name portable Codex project config as a deliberate discovery consumer: no root flags are serialized and the host workspace cwd must reach the child unchanged. No ordering change. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `MASTERPLAN.md` §6.3 S-24 | Approved scope and acceptance: stable shim registration, exact cleanup and machine-specific drain. |
| EPIC-011 `context.md` | Registration must be byte-identical across machines and survive update/move through the installer-owned shim. |
| `GUI-099` plan/research | Prerequisite launcher path, HKCU lifecycle, `--probe` behavior and quoting contract. GUI-100 consumes it; it does not reimplement installer ownership. |
| Archived `GUI-094` research/files/plan | Verified source analysis for exact TOML, provider split, trust, legacy sweep and two-location expectations. Apply only the GUI-100 slice. |
| `apps/gui/src/main/connect.ts` | Current `serverInvocation`, atomic writes, config-file/CLI branch, trust note and best-effort legacy command cleanup. Preserve these semantics around the new preflight. |
| `apps/gui/src/main/providers.ts` | Pure serializers and shared Codex/Grok TOML format. Changing the serializer globally can regress Grok, so use conditional fields and matrix tests. |
| `apps/gui/src/main/providers.test.ts` | Existing exact registration, legacy sweep, trust and provider-registry invariants. Extend rather than replace. |
| `apps/gui/src/main/connect.test.ts` | Existing command-execution seams and failure-reporting patterns. Use an injectable/controlled execution seam rather than requiring a real install in unit tests. |
| `packages/core/src/staleness.ts` | Rootless registration is already intentionally discovery-based/current. Do not make core parse full TOML or know about `%LOCALAPPDATA%`. |
| `.gitignore` | `.codex/config.toml` remains ignored until GUI-101/102's real-host portability proof authorizes making it shareable. Do not change in this ticket. |
| `apps/gui/src/main/mcp-sessions.ts` | Launcher process/session behavior context. No production change is expected because the child remains installed `Kanmer.exe` + `kanmer-mcp.cjs`. |
| `docs/architecture/adr/ADR-0018-installer-owned-mcp-launcher.md` (after GUI-099) | Governs the stable launcher descriptor; GUI-100 must serialize it exactly and never synthesize another path/registry contract. |

## Ripple effects

- Reconnecting Codex rewrites only its Kanmer TOML table into canonical rootless form and makes eligible legacy global entries drainable.
- Two repositories on different machines receive identical Kanmer registration bytes, but each still requires Codex trust and a healthy local Kanmer installation.
- Disconnect remains symmetric by removing exactly the `kanmer` table and any existing best-effort legacy command, preserving unrelated TOML.
- Other providers must retain their current absolute/root-pinned invocation and environment; the shared TOML serializer change is safe only with explicit regression coverage.
- Core staleness will see the new rootless entry as current by design.
- GUI-101/102 depend on this exact byte contract for packaged/real-host proof and migration notes.

## Out of scope

- Creating/updating/removing the fixed shim, HKCU value or NSIS hooks (GUI-099).
- Unignoring/committing `.codex/config.toml`, installer package assertions, live update survival or machine-move proof (GUI-101/102).
- Portable registration for Claude, OpenCode, Grok or Antigravity.
- Plugin installation, dispatch, MCP transport/tools, board discovery changes, global config reserialization or automatic Git commits.
- Absolute-path fallback when the stable launcher is unhealthy.
