# Checklist — GUI-100

## Prerequisite and governing contract

- [ ] Confirm GUI-099's merged launcher path, quoting and `--probe` contract exactly match this packet.
- [ ] Stop and report rather than guessing if the launcher contract differs or is not available.
- [ ] Amend FRD-012 with the exact portable Codex project registration and migration/disconnect behavior.
- [ ] Amend ADR-0012 to name portable Codex as a discovery consumer without changing discovery order.
- [ ] Link GUI-099's focused launcher ADR and clear `docs_todo` after it exists.

## Canonical invocation

- [ ] Generalize `Invocation` comments so they are not Electron/root-specific.
- [ ] Add one pure immutable/fresh canonical Codex launcher descriptor.
- [ ] Set command exactly to `cmd.exe`.
- [ ] Set args exactly to `/d`, `/s`, `/c`, and the quoted `%LOCALAPPDATA%\Kanmer\bin\kanmer-mcp.cmd` command string.
- [ ] Keep the canonical invocation env empty.
- [ ] Include no cwd, username, drive, install path, executable path, bundle path, `--root` or `--repo-root`.
- [ ] Keep the fixed command literal single-source in production code.

## Shared TOML serialization

- [ ] Retain one `tomlMcpServersMerge` for Codex and Grok.
- [ ] Serialize command and args for every invocation.
- [ ] Serialize `env` only when non-empty.
- [ ] Preserve unrelated TOML values, trust tables and MCP servers.
- [ ] Preserve byte-idempotent canonical re-merge.
- [ ] Preserve surgical Kanmer unmerge and empty-parent cleanup.
- [ ] Prove Grok still receives its existing non-empty environment and bytes.

## Provider-aware selection

- [ ] Rename the existing absolute invocation helper to state its installed-Electron scope.
- [ ] Select the canonical portable invocation only for provider id `codex`.
- [ ] Select the unchanged installed-Electron/root-pinned invocation for every other provider.
- [ ] Do not branch config paths, skill installers, marketplace commands or dispatch behavior.

## Probe-before-write

- [ ] Add an explicit-argv `execFile`/spawn probe helper.
- [ ] Use the same `cmd.exe /d /s /c` fixed shim contract with launcher-owned `--probe`.
- [ ] Run the probe from `projectRoot` before any Codex config read/write side effect.
- [ ] Set hidden-window, finite-timeout and bounded-output behavior.
- [ ] Treat exit 0 as healthy.
- [ ] On spawn/timeout/non-zero failure, return `ok:false` with safe diagnostics and repair/reinstall guidance.
- [ ] On probe failure, create/write/remove zero config, skill or legacy-registration bytes.
- [ ] Provide no absolute-path fallback.
- [ ] Do not probe non-Codex providers.
- [ ] Keep the execution seam controllable in unit tests without weakening production discovery.

## Connect, migration and disconnect

- [ ] After a successful probe, atomically merge the canonical project entry.
- [ ] Replace an owned old absolute Kanmer project entry without disturbing unrelated TOML.
- [ ] Preserve the existing Codex trust note and trusted-project behavior.
- [ ] Preserve best-effort/surgical legacy global removal after a successful write.
- [ ] Treat the trusted rootless project entry as a valid replacement for eligible legacy entries.
- [ ] Preserve pure disconnect/unmerge and legacy cleanup.
- [ ] Run Connect twice and prove idempotence.
- [ ] Run disconnect twice and prove no collateral deletion.

## Exact tests

- [ ] Assert the canonical parsed entry has command plus exactly four args and no env/cwd/root fields.
- [ ] Produce registrations from two different simulated users/drives/install/source/board roots and assert byte equality.
- [ ] Assert no forbidden machine/project/server paths appear in output.
- [ ] Assert an old machine-specific project entry becomes canonical on reconnect.
- [ ] Assert unrelated top-level values, trust entries and other servers survive.
- [ ] Assert canonical re-merge is byte-stable.
- [ ] Assert unmerge removes only the owned Kanmer table.
- [ ] Assert every non-Codex provider's registration/install/dispatch fixture remains unchanged.
- [ ] Assert probe occurs before mutation.
- [ ] Assert failed and timed-out probes leave absent/existing config byte-identical.
- [ ] Assert successful probe writes canonical bytes and retains trust guidance.
- [ ] Assert no fallback command/root flags are emitted on failure.
- [ ] Assert eligible legacy cleanup occurs only after successful project registration.
- [ ] Add the exact portable TOML to core staleness tests and assert it is current.
- [ ] Retain explicit wrong-root staleness coverage.

## Examples, docs and verification

- [ ] Replace `examples/codex-config.toml` with the exact installed portable block.
- [ ] Document supported Windows installation, trust and repair prerequisites.
- [ ] Retain the warning against combining plugin and manual registration.
- [ ] Keep `.codex/config.toml` ignored in this ticket.
- [ ] Do not claim real machine-move/update proof before GUI-101/102.
- [ ] Run GUI tests.
- [ ] Run core tests.
- [ ] Run typecheck and root tests.
- [ ] Run manual/document checks.
- [ ] Run `git diff --check` and inspect `git status --short`.
- [ ] Confirm no installer, packaging, other-provider, transport or consumer-repository scope entered the diff.

## Stop condition

- [ ] Stop with the exact registration/migration PR ready for independent review; do not merge or start GUI-101.

## Progress notes

Append implementation notes here; do not broaden the approved plan.
