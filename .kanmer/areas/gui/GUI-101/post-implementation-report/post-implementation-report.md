# Post-implementation report — GUI-101

*Author claim before merge; this report does not substitute for merged-main proof or unavailable real-host evidence.*

## Summary

GUI-101 extends the existing packaged-output updater gate with the remaining GUI-099 launcher contract assertions: --probe, extraFiles, and NSIS install/uninstall ownership markers. It adds dependency-free synthetic package fixtures and a process-session regression for the launcher parent/installed MCP child shape. The deterministic package and test rails pass. A real installed NSIS update and two-location Codex host proof are explicitly INCONCLUSIVE on this machine: no Kanmer HKCU installation exists, no safe update feed/second host is available, and the read-only unpacked --probe correctly returned exit 65 without changing user state. Consequently .codex/config.toml remains ignored and no GUI-102 integration claim is made.

## Changes

| File | Change | Why |
|---|---|---|
| scripts/check-updater-package.mjs | Extended the existing failure collector to require the packaged --probe marker, install-root extraFiles mapping, and NSIS lifecycle/ownership markers. | Make the one authoritative dist:check rail detect launcher packaging omissions before release. |
| scripts/check-updater-package.test.mjs | Added four dependency-free synthetic-output tests: healthy package, missing launcher, malformed launcher, and missing MCP bundle. | Exercise failure aggregation without pretending fixtures are installer lifecycle proof. |
| apps/gui/src/shared/mcp-sessions.test.ts | Added launcher-parent/installed-child/unrelated-cmd fixture and asserts only the installed MCP child is counted/stoppable. | Preserve updater safety for the GUI-099 process shape without broad cmd.exe matching. |

No production session detector change was required. No .gitignore, provider serializer, launcher/NSIS implementation, updater protocol, release feed, release notes, manual, or GUI-102 integration file was changed because the required real-host evidence is unavailable and the plan permits no speculative shareability decision.

## Governing docs

- EPIC-011: deterministic packaging checks are complete; the required machine-move/update outcome remains explicitly INCONCLUSIVE and must be supplied by a safe host lane before the epic is closed.
- MASTERPLAN §6.3 S-25: the existing dist:check rail now asserts the packaged launcher and installer lifecycle inputs; no second verifier was introduced.
- FRD-012: canonical registration bytes remain owned by GUI-100 and unchanged here. The shareability/migration changes are intentionally deferred because the two-location packaged proof did not PASS.
- FRD-021: updater session detection remains fail-closed and unchanged in production; the new fixture confirms the installed MCP child shape is counted while cmd.exe parents/decoys are ignored. A real update continuity claim is not made.
- ADR-0012 and ADR-0018: packaged checks consume the inherited-cwd, fixed-shim, HKCU and MCP bundle contracts without changing either decision.
- GUI-099/GUI-100 merged proofs were re-read; this ticket does not recreate or absorb their implementation.

## Risks / follow-ups

- Real installed update continuity is INCONCLUSIVE, not PASS. The current host has no HKCU Software/Kanmer/InstallDir; direct packaged shim probe returned exit 65 (installation is missing or invalid). No registry, install, feed, user, or repository state was mutated.
- Two-location config byte equality, fresh-host get_status before/after update, server identity transition, and .codex/config.toml shareability remain unchecked. GUI-102 owns final combined acceptance; a safe disposable Windows/VM/feed lane must provide the missing evidence before unignoring the file.
- No real process chain was captured; the synthetic parser fixture is deterministic unit evidence only. Do not present it as installed-host proof.
- Package artifact evidence is local and reproducible: installer SHA-256 75DA8A39417F56F88011DE7CDEEAF311574F23F80E5CC7226046A1DF7FAD99B3, blockmap 3ED53CDD576653F215EA54F8BBD7847B241D0646C3491CD5ED709FE841F28A5B, latest.yml 71A01B65CA11AA7736E8A1D6545437A85A65F5021970FD76321B803CF6A4952E, unpacked shim E1017FA460D5A6B9847E6008A8E2C06A74ECC80C0B09171601631CD26D7E2C41.

## Verification hand-off

On merged main, run npm test, npm run typecheck, npm run dist:check, npm run check:manual, node scripts/check-doc-numbering.mjs, and git diff --check. Preserve the deterministic synthetic fixture tests and session regression. For the missing real evidence, use a disposable/snapshotted Windows environment with old/new packages and a controlled update feed: record installer/latest.yml/shim/config hashes, HKCU/shim state, process chain, before/after fresh-host get_status, updater stop/install results, and complete cleanup. Only after two genuinely different user/install/repository paths PASS may a follow-up remove only .codex/config.toml from .gitignore and update FRD/release/manual migration guidance.
