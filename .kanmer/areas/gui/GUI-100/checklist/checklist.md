# Checklist — GUI-100

## Prerequisite and governing contract

- [x] Confirm GUI-099's merged launcher path, quoting and `--probe` contract exactly match this packet.
- [x] Stop and report rather than guessing if the launcher contract differs or is not available.
- [x] Amend FRD-012 with the exact portable Codex project registration and migration/disconnect behavior.
- [x] Amend ADR-0012 to name portable Codex as a discovery consumer without changing discovery order.
- [x] Link GUI-099's focused launcher ADR and clear `docs_todo` after it exists.

## Canonical invocation

- [x] Generalize `Invocation` comments so they are not Electron/root-specific.
- [x] Add one pure immutable/fresh canonical Codex launcher descriptor.
- [x] Set command exactly to `cmd.exe`.
- [x] Set args exactly to `/d`, `/s`, `/c`, and the quoted `%LOCALAPPDATA%\Kanmer\bin\kanmer-mcp.cmd` command string.
- [x] Keep the canonical invocation env empty.
- [x] Include no cwd, username, drive, install path, executable path, bundle path, `--root` or `--repo-root`.
- [x] Keep the fixed command literal single-source in production code.

## Shared TOML serialization

- [x] Retain one `tomlMcpServersMerge` for Codex and Grok.
- [x] Serialize command and args for every invocation.
- [x] Serialize `env` only when non-empty.
- [x] Preserve unrelated TOML values, trust tables and MCP servers.
- [x] Preserve byte-idempotent canonical re-merge.
- [x] Preserve surgical Kanmer unmerge and empty-parent cleanup.
- [x] Prove Grok still receives its existing non-empty environment and bytes.

## Provider-aware selection

- [x] Rename the existing absolute invocation helper to state its installed-Electron scope.
- [x] Select the canonical portable invocation only for provider id `codex`.
- [x] Select the unchanged installed-Electron/root-pinned invocation for every other provider.
- [x] Do not branch config paths, skill installers, marketplace commands or dispatch behavior.

## Probe-before-write

- [x] Add an explicit-argv `execFile`/spawn probe helper.
- [x] Use the same `cmd.exe /d /s /c` fixed shim contract with launcher-owned `--probe`.
- [x] Run the probe from `projectRoot` before any Codex config read/write side effect.
- [x] Set hidden-window, finite-timeout and bounded-output behavior.
- [x] Treat exit 0 as healthy.
- [x] On spawn/timeout/non-zero failure, return `ok:false` with safe diagnostics and repair/reinstall guidance.
- [x] On probe failure, create/write/remove zero config, skill or legacy-registration bytes.
- [x] Provide no absolute-path fallback.
- [x] Do not probe non-Codex providers.
- [x] Keep the execution seam controllable in unit tests without weakening production discovery.

## Connect, migration and disconnect

- [x] After a successful probe, atomically merge the canonical project entry.
- [x] Replace an owned old absolute Kanmer project entry without disturbing unrelated TOML.
- [x] Preserve the existing Codex trust note and trusted-project behavior.
- [x] Preserve best-effort/surgical legacy global removal after a successful write.
- [x] Treat the trusted rootless project entry as a valid replacement for eligible legacy entries.
- [x] Preserve pure disconnect/unmerge and legacy cleanup.
- [x] Run Connect twice and prove idempotence.
- [x] Run disconnect twice and prove no collateral deletion.

## Exact tests

- [x] Assert the canonical parsed entry has command plus exactly four args and no env/cwd/root fields.
- [x] Produce registrations from two different simulated users/drives/install/source/board roots and assert byte equality.
- [x] Assert no forbidden machine/project/server paths appear in output.
- [x] Assert an old machine-specific project entry becomes canonical on reconnect.
- [x] Assert unrelated top-level values, trust entries and other servers survive.
- [x] Assert canonical re-merge is byte-stable.
- [x] Assert unmerge removes only the owned Kanmer table.
- [x] Assert every non-Codex provider's registration/install/dispatch fixture remains unchanged.
- [x] Assert probe occurs before mutation.
- [x] Assert failed and timed-out probes leave absent/existing config byte-identical.
- [x] Assert successful probe writes canonical bytes and retains trust guidance.
- [x] Assert no fallback command/root flags are emitted on failure.
- [x] Assert eligible legacy cleanup occurs only after successful project registration.
- [x] Add the exact portable TOML to core staleness tests and assert it is current.
- [x] Retain explicit wrong-root staleness coverage.

## Examples, docs and verification

- [x] Replace `examples/codex-config.toml` with the exact installed portable block.
- [x] Document supported Windows installation, trust and repair prerequisites.
- [x] Retain the warning against combining plugin and manual registration.
- [x] Keep `.codex/config.toml` ignored in this ticket.
- [x] Do not claim real machine-move/update proof before GUI-101/102.
- [x] Run GUI tests.
- [x] Run core tests.
- [x] Run typecheck and root tests.
- [x] Run manual/document checks.
- [x] Run `git diff --check` and inspect `git status --short`.
- [x] Confirm no installer, packaging, other-provider, transport or consumer-repository scope entered the diff.

## Stop condition

- [x] Stop with the exact registration/migration PR ready for independent review; do not merge or start GUI-101.

## Progress notes

Append implementation notes here; do not broaden the approved plan.

- Implementation is confined to the approved eight files; GUI-099 launcher/NSIS ownership, `.gitignore`, provider registration outside Codex, transport, packaging and GUI-101/102 proof were not changed.
- Verification: focused GUI `npx vitest run src/main/connect.test.ts src/main/providers.test.ts` exit 0 (91/91); focused core `npx vitest run src/staleness.test.ts` exit 0 (41/41); full GUI exit 0 (37 files, 343 tests); full core exit 0 (11 files, 257 tests); `npm run typecheck` exit 0; `npm run build` exit 0; `npm test` clean rerun exit 0 (manual, core, GUI, MCP HTTP 61/61, scripts 75/75); `npm run check:manual` exit 0; `node scripts/check-doc-numbering.mjs` exit 0; `git diff --check` exit 0.
- Retained failure: the initial malformed root test invocation before build exited 1 because `packages/core/dist/index.js` was absent for `scripts/auto-run-state.test.mjs`; an earlier concurrent HTTP attempt also reported two bounded timeout failures (`project resolution...`, `readiness...`). After building artifacts, the clean authoritative `npm test` rerun passed all rails; no assertion was weakened or removed.
- Controlled probe evidence is unit-level only: successful explicit argv/cwd/hidden/10s/32KiB probe seam and failed-probe zero-config/no-fallback behavior pass. No real installer host or provider registration proof is claimed; GUI-101/GUI-102 retain packaged/update/machine-move and host evidence.
- Ready for independent review; do not merge or start GUI-101.
