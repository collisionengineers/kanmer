# Post-implementation report — GUI-100

*Author claim before merge; merged-main proof remains the responsibility of kanmer-verify.*

## Summary

Codex Connect now writes the byte-identical, rootless Windows registration owned by the GUI-099 installer shim and probes that launcher before touching project configuration. Reconnect replaces only Kanmer's TOML entry, while the existing trust, legacy cleanup, disconnect and all non-Codex provider behavior remain intact. This ticket does not claim a real installer host, update, uninstall or machine-move result; those remain GUI-101/GUI-102 scope.

## Changes

| File | Change | Why |
|---|---|---|
| apps/gui/src/main/providers.ts | Modified invocation contract and conditional TOML env serialization; added fresh canonical Codex/probe descriptors. | Keep one exact cmd.exe /d /s /c launcher contract with no machine/project/root data while retaining non-empty Grok environment behavior. |
| apps/gui/src/main/connect.ts | Added provider-aware invocation selection and explicit-argv Codex preflight with bounded Windows execution options. | Refuse before config/skill/legacy mutation when the installer-owned launcher is unhealthy; retain installed Electron/root-pinned behavior for every other provider. |
| apps/gui/src/main/providers.test.ts | Added exact portable TOML, byte-stability, probe descriptor and no-forbidden-path assertions. | Lock the canonical shape and shared serializer/provider regression boundary. |
| apps/gui/src/main/connect.test.ts | Added provider selection, explicit probe options/success, and failed-probe zero-mutation/no-fallback tests. | Prove the preflight contract without requiring a real installed launcher in unit tests. |
| packages/core/src/staleness.test.ts | Added exact portable Codex registration regression. | Confirm the existing rootless discovery model treats the new entry as current; production staleness code remains unchanged. |
| examples/codex-config.toml | Replaced source-checkout/Node/root-pinned example with the supported portable Windows block and prerequisites. | Keep manual guidance byte-identical with Connect and warn against duplicate plugin/manual registration. |
| docs/functional/frd/FRD-012-connect.md | Added R1e portable command/probe/no-fallback and GUI-101/102 boundary; clarified ignored registration policy and non-Codex contracts. | Make the end-state registration and deferred real-host proof explicit. |
| docs/architecture/adr/ADR-0012-board-discovery-order.md | Added Codex Connect as a discovery consumer without changing ordering. | Record that the shim inherits the provider workspace cwd and serializes no root flags. |

## Governing docs

- EPIC-011 context: meets the byte-identical portable registration requirement and consumes the accepted GUI-099 launcher boundary.
- MASTERPLAN §6.3 S-24: meets the stable cmd.exe /d /s /c shim form, surgical reconnect/cleanup behavior and no absolute fallback.
- FRD-012: modified with the approved R1e exact TOML/probe/trust/disconnect behavior; Claude, OpenCode, Grok and Antigravity remain out of the portable-registration change.
- ADR-0012: modified only to name the portable Codex consumer; discovery order is unchanged.
- ADR-0018 (linked): consumed as the installer-owned launcher contract; GUI-100 does not create or modify shim/NSIS/HKCU lifecycle code.

## Risks / follow-ups

- No physical Windows installer, Codex host, update, uninstall or machine-move proof is claimed. GUI-101/GUI-102 must provide that evidence before any registration-file policy change.
- The fixed launcher is Windows-only and Connect refuses when --probe fails; repair/reinstall is the intended recovery path.
- .codex/config.toml remains ignored. No provider registration, transport, packaging or consumer repository was changed.
- The initial pre-build scripts invocation and an earlier concurrent HTTP attempt failed; both are retained in the checklist. After artifacts were built, the authoritative clean npm test passed all rails.

## Verification hand-off

On merged main, run npm test, npm run typecheck, npm run build, npm run check:manual, node scripts/check-doc-numbering.mjs, and git diff --check. Re-run the focused GUI Connect/provider and core staleness suites. Confirm the merged diff leaves .gitignore, installer/NSIS files, non-Codex provider behavior and GUI-101/GUI-102 evidence untouched. Do not represent unit-level probe seams as real-host proof; capture any later disposable Windows host evidence under GUI-101/GUI-102.
