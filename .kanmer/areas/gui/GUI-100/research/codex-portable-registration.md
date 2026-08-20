# Research — GUI-100: Codex Connect registration through the stable shim

## Question

How can Codex Connect write one byte-identical project registration across machines while preserving the existing provider registry, TOML merge semantics, trust guidance, legacy cleanup and non-Codex behavior?

## Findings

- `apps/gui/src/main/connect.ts` currently computes one `serverInvocation(boardRoot, projectRoot)` before branching by provider. That invocation always embeds `process.execPath`, the concrete packaged/dev MCP bundle path, `--root`, optional `--repo-root`, and `ELECTRON_RUN_AS_NODE=1`. Passing it to Codex is the source of machine-specific project TOML.
- `apps/gui/src/main/providers.ts` deliberately keeps registration serialization pure. Codex and Grok share `tomlMcpServersMerge`; the serializer is not the reason the paths are machine-specific—the `Invocation` supplied to it is.
- The shared TOML serializer currently always writes `env`, because every invocation historically used Electron-as-Node. The portable Codex launcher requires no environment table. The serializer should include `env` only when non-empty so Grok/non-Codex behavior remains unchanged while the Codex entry has the exact approved shape.
- The approved canonical logical invocation is:

  ```text
  command = cmd.exe
  args = /d, /s, /c, "%LOCALAPPDATA%\Kanmer\bin\kanmer-mcp.cmd"
  env = empty/omitted
  ```

  It contains no expanded username, drive, install directory, source root, board root, `Kanmer.exe`, MCP bundle path, `--root`, `--repo-root` or `cwd`.
- `cmd.exe /d /s /c` is load-bearing: `/d` disables AutoRun; the final command string quotes the fixed shim path; `%LOCALAPPDATA%` is expanded by the destination machine at runtime.
- GUI-099 owns the fixed shim/HKCU lifecycle and blocks this ticket. GUI-100 must not generate an absolute fallback when the launcher is absent; doing so would recreate the portability defect.
- Connect can preflight the same launcher by invoking the fixed command with `--probe` before any `.codex/config.toml` mutation. Use `execFile`/spawn with explicit argv rather than concatenating a second shell command.
- `connectAgent` already uses atomic config replacement after pure merge. For Codex, the same `[mcp_servers.kanmer]` key means reconnect naturally replaces an existing machine-specific project entry with the canonical portable entry while preserving other tables/servers.
- `disconnectAgent` calls the provider's pure `unmerge`, which removes only `mcp_servers.kanmer` and retains unrelated TOML. It does not need to know whether the removed entry was old or portable.
- Legacy global entries are removed through the existing Codex `removeCommands`/sweep behavior. After the project file contains the canonical rootless entry, it is a valid replacement. Tests must pin that the entry is considered registered/trusted even without `--root`.
- `packages/core/src/staleness.ts` already treats a Kanmer registration with no explicit `--root` as discovery-based and therefore not stale. The exact canonical TOML should be added as a regression fixture; production logic should not gain a TOML dependency or launcher awareness.
- `examples/codex-config.toml` still documents a source checkout, Node and explicit cwd/root. It must change to the installed portable command or it will teach the old failure after Connect is fixed.
- `.gitignore` currently ignores `.codex/config.toml`. The archived GUI-094 plan says make it shareable only after packaged/two-location proof. That evidence belongs to GUI-101/GUI-102, so GUI-100 must not unignore or commit consumer configuration prematurely.
- Provider tests already pin exact non-Codex registrations, config paths, skill installs and dispatch args. Extend them into a table-driven non-regression rail rather than modifying other provider definitions.

## Implications

- Introduce one canonical, pure Codex launcher invocation descriptor and select it only for provider id `codex`.
- Keep `tomlMcpServersMerge` shared; make only its empty-env serialization conditional.
- Probe GUI-099's launcher before writing and refuse with actionable repair text if unhealthy.
- Preserve the current trust note, atomic merge, idempotence, disconnect/unmerge, and best-effort legacy cleanup.
- Update exact examples/docs/tests, but leave installer packaging/lifecycle and real-host update proof to GUI-099/101/102.

## Open questions

None. The canonical bytes, failure behavior, provider boundary and migration path are fixed by MASTERPLAN S-24, EPIC-011 and archived GUI-094 source material.
