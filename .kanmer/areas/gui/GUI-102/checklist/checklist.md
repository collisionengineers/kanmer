# Checklist — GUI-102

## Immutable prerequisites

- [x] PASS — Record merged GUI-099, GUI-100 and GUI-101 SHAs. (Evidence: landed merge SHAs GUI-099 d9379d32ffa775ab1ef957dd58ac65acb6e29fca, GUI-100 3403fd86622e8223fec3e1bb691eb2e0eb960482, GUI-101 c362217a43056622b7e5f3cd42bf79d91a661e81)
- [x] INCONCLUSIVE — Confirm each prerequisite proof is PASS and covers its owned contract. (Evidence: GUI-099/100 deterministic proofs PASS; GUI-101 deterministic package proof PASS but installed/two-location acceptance remains INCONCLUSIVE)
- [x] PASS — Confirm the package under test contains all prerequisite SHAs and matching versions. (Evidence: all prerequisite merge SHAs are ancestors of HEAD 34245be0 and package version is 0.3.3)
- [x] FAIL — Run deterministic verification and `dist:check`; stop on failure. (Evidence: npm run verify exit 1 at mcpb:check for missing @anthropic-ai/mcpb/dist/cli/cli.js; npm run dist:check independently exit 0)
- [x] INCONCLUSIVE — Freeze the canonical config hash and launcher/HKCU contract. (Evidence: serializer/probe contract read, but no safe installed HKCU/config capture; read-only HKCU query exit 1)
- [x] PASS — Create a unique integration run/log identifier. (Evidence: run id GUI-102-20260822T192404Z-gui099; outcomes recorded in proof and scratch)

## Clean environment

- [x] INCONCLUSIVE — Use a disposable/snapshotted Windows environment. (Evidence: no safe disposable Windows user/VM/feed was available; existing installed state was not mutated)
- [x] PASS — Record OS, architecture, user/profile, time zone, Codex and package versions. (Evidence: Windows 11 Pro build 26200, AMD64, GMT Standard Time, Alex, Node 24.15.0, npm 11.14.1, Codex 0.149.0, package 0.3.3)
- [x] FAIL — Confirm/record absence of prior launcher, HKCU value, install, registration and processes. (Evidence: fixed local shim absent and HKCU query exit 1, but six Kanmer.exe processes exist under AppData\Local\Programs\Kanmer; none were altered)
- [x] PASS — Preserve/snapshot legitimate pre-existing state rather than deleting blindly. (Evidence: no registry, install, process, project or feed state was mutated)
- [x] INCONCLUSIVE — Add unrelated LOCALAPPDATA and registry sentinels. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Create a disposable source repo, canonical board worktree and linked ticket worktree. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Add unrelated TOML/server content to the project config fixture. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Record complete pre-run file/registry/process/config census and hashes. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)

## Fresh install

- [x] INCONCLUSIVE — Install baseline package through real NSIS into a custom path with spaces. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Record installer command/log/exit and package hash. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Assert fixed shim exists with expected hash. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Assert HKCU points to selected install path. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Assert installed executable and MCP bundle exist. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Run installed `--probe` successfully. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Assert unrelated sentinels are unchanged. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)

## Normal registration and discovery

- [x] INCONCLUSIVE — Open installed GUI on the disposable project. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Run normal Codex Connect, not a hand-edited registration. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Record probe and Connect result/notes. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Assert resulting Kanmer table equals canonical bytes/hash. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Assert unrelated TOML survives and no local path/identity is serialized. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Establish supported Codex trust. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Invoke `get_status` from source repo. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Assert canonical board/source roots and installed baseline server identity. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Invoke `get_status` from linked worktree. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Assert the same canonical project identity. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Capture raw payloads/process chain and prove wrapper stdout cleanliness. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)

## Reconnect, legacy migration and disconnect

- [x] INCONCLUSIVE — Seed one eligible old owned machine-specific registration through the controlled fixture. (Evidence: focused GUI Connect/provider fixtures 94/94 PASS cover canonical bytes, legacy drain and surgical/idempotent disconnect; not live packaged-host proof)
- [x] INCONCLUSIVE — Reconnect and assert canonical project bytes remain idempotent. (Evidence: focused GUI Connect/provider fixtures 94/94 PASS cover canonical bytes, legacy drain and surgical/idempotent disconnect; not live packaged-host proof)
- [x] INCONCLUSIVE — Assert eligible legacy entry drains and unrelated registrations remain. (Evidence: focused GUI Connect/provider fixtures 94/94 PASS cover canonical bytes, legacy drain and surgical/idempotent disconnect; not live packaged-host proof)
- [x] INCONCLUSIVE — Disconnect and assert only owned project/legacy state is removed. (Evidence: focused GUI Connect/provider fixtures 94/94 PASS cover canonical bytes, legacy drain and surgical/idempotent disconnect; not live packaged-host proof)
- [x] INCONCLUSIVE — Disconnect again and assert no collateral change. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Connect again and assert exact canonical hash is restored. (Evidence: focused GUI Connect/provider fixtures 94/94 PASS cover canonical bytes, legacy drain and surgical/idempotent disconnect; not live packaged-host proof)

## Real update

- [x] INCONCLUSIVE — Record pre-update config/shim/registry/install hashes. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Start a real installed MCP session through Codex. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Confirm updater diagnostics identify the installed child, not unrelated cmd processes. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Make the controlled newer release available through the real feed. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Trigger update through the supported application UI/path. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Record every updater state, session-stop result, installer log, exit and failed attempt. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Respect documented refusal/remediation; do not bypass session/update safety. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — After success, assert new install is complete. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Assert fixed shim/HKCU resolve the current installation. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Assert unrelated sentinels and project config hash are unchanged. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Start a fresh Codex host and invoke `get_status` from source. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Assert same project identity and new server version/path/hash. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Repeat from linked worktree. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Assert no reconnect was needed solely due to update. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)

## Uninstall and expected failure

- [x] INCONCLUSIVE — Close running GUI/MCP sessions normally. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Run the current normal uninstaller and record log/exit. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Assert application payload, fixed shim and matching HKCU value are removed. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Assert project config and unrelated sentinels remain unchanged. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Assert parent directory/key cleanup is ownership-safe. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Attempt a fresh post-uninstall tool launch. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Assert clear actionable failure and no stale/alternate install selection. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)

## Reinstall recovery

- [x] INCONCLUSIVE — Reinstall new package into a second custom directory. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Assert launcher/HKCU/probe are restored. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Keep project config bytes unchanged. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Invoke `get_status` from source and linked worktree successfully. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Assert correct project and new installed server identity. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Run final surgical Disconnect/Connect and assert canonical bytes. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)

## Documentation and rails

- [x] INCONCLUSIVE — Execute the documented existing-user migration path exactly. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] INCONCLUSIVE — Check FRD-012, FRD-021, ADR-0012, launcher ADR, example, manual and release notes against observations. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] PASS — Record dispositions for every discrepancy and fail on blocking mismatch. (Evidence: deterministic failure and unavailable-host boundaries are recorded in report/proof)
- [x] PASS — Confirm no other provider was modified. (Evidence: no production source/provider change or lifecycle mutation was made)
- [x] FAIL — Run `npm run verify`. (Evidence: exit 1 after component rails passed; mcpb:check failed MODULE_NOT_FOUND for @anthropic-ai/mcpb/dist/cli/cli.js)
- [x] PASS — Run `npm run dist:check`. (Evidence: exit 0; Windows package built and updater package check 8/8)
- [x] PASS — Run manual/document checks and diff/status checks. (Evidence: check:manual exit 0, doc-numbering exit 0, git diff --check exit 0, worktree clean)
- [x] PASS — Record exact exit codes/output hashes and retain failures. (Evidence: verify 1, dist:check 0, probe 65, HKCU query 1, focused tests 94/94 and typecheck 0 are retained)

## Cleanup and proof

- [x] INCONCLUSIVE — Remove reinstall through normal uninstaller. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] PASS — Remove disposable projects/worktrees/feed/releases/tags/users/VM state and sentinels. (Evidence: no disposable state was created and no legitimate state changed)
- [x] PASS — Restore legitimate pre-existing state. (Evidence: no disposable state was created and no legitimate state changed)
- [x] INCONCLUSIVE — Perform final file/registry/process/config census proving no residue/secrets. (Evidence: required real-host or manual evidence is unavailable; no unsupported PASS claim is made)
- [x] PASS — Write proof bound to exact prerequisite/package SHAs and environment. (Evidence: proof/proof.md records prerequisite/package SHAs, hashes, attempts and INCONCLUSIVE result)
- [x] PASS — Classify result PASS, FAIL or INCONCLUSIVE; do not omit attempts. (Evidence: overall result explicitly classified INCONCLUSIVE)

## Stop condition

- [x] INCONCLUSIVE — Stop after the complete clean lifecycle and proof; do not merge, implement unrelated fixes or start another ticket. (Evidence: real NSIS/Connect/update/uninstall/reinstall lifecycle unavailable; stopped safely and did not claim Done)

## Progress notes

Append run events and evidence references here without rewriting acceptance criteria.

Disposition convention: each checked item is labelled PASS, FAIL or INCONCLUSIVE; checked INCONCLUSIVE/FAIL items are recorded outcomes, not success claims.

- Run GUI-102-20260822T192404Z-gui099: GUI-099/100/101 merge SHAs and proofs read; package built from HEAD 34245be0.
- Deterministic evidence: focused Connect/provider 94/94 PASS; typecheck 0; dist:check 0 with updater package 8/8; check:manual/doc-numbering/diff-check 0.
- Preserved failure: npm run verify exit 1 at mcpb:check because @anthropic-ai/mcpb/dist/cli/cli.js is missing.
- Real-host boundary: unpacked shim probe exit 65; HKCU InstallDir query exit 1; fixed LOCALAPPDATA shim absent; six existing Kanmer.exe processes observed and left untouched. No install, registry, feed, process, project or user state was mutated.

Disposition convention: each checked item is labelled PASS, FAIL or INCONCLUSIVE; checked INCONCLUSIVE/FAIL items are recorded outcomes, not success claims.

- Run GUI-102-20260822T192404Z-gui099: GUI-099/100/101 merge SHAs and proofs read; package built from HEAD 34245be0.
- Deterministic evidence: focused Connect/provider 94/94 PASS; typecheck 0; dist:check 0 with updater package 8/8; check:manual/doc-numbering/diff-check 0.
- Preserved failure: npm run verify exit 1 at mcpb:check because @anthropic-ai/mcpb/dist/cli/cli.js is missing.
- Real-host boundary: unpacked shim probe exit 65; HKCU InstallDir query exit 1; fixed LOCALAPPDATA shim absent; six existing Kanmer.exe processes observed and left untouched. No install, registry, feed, process, project or user state was mutated.
