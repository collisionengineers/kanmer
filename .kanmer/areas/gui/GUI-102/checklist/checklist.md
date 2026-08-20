# Checklist — GUI-102

## Immutable prerequisites

- [ ] Record merged GUI-099, GUI-100 and GUI-101 SHAs.
- [ ] Confirm each prerequisite proof is PASS and covers its owned contract.
- [ ] Confirm the package under test contains all prerequisite SHAs and matching versions.
- [ ] Run deterministic verification and `dist:check`; stop on failure.
- [ ] Freeze the canonical config hash and launcher/HKCU contract.
- [ ] Create a unique integration run/log identifier.

## Clean environment

- [ ] Use a disposable/snapshotted Windows environment.
- [ ] Record OS, architecture, user/profile, time zone, Codex and package versions.
- [ ] Confirm/record absence of prior launcher, HKCU value, install, registration and processes.
- [ ] Preserve/snapshot legitimate pre-existing state rather than deleting blindly.
- [ ] Add unrelated LOCALAPPDATA and registry sentinels.
- [ ] Create a disposable source repo, canonical board worktree and linked ticket worktree.
- [ ] Add unrelated TOML/server content to the project config fixture.
- [ ] Record complete pre-run file/registry/process/config census and hashes.

## Fresh install

- [ ] Install baseline package through real NSIS into a custom path with spaces.
- [ ] Record installer command/log/exit and package hash.
- [ ] Assert fixed shim exists with expected hash.
- [ ] Assert HKCU points to selected install path.
- [ ] Assert installed executable and MCP bundle exist.
- [ ] Run installed `--probe` successfully.
- [ ] Assert unrelated sentinels are unchanged.

## Normal registration and discovery

- [ ] Open installed GUI on the disposable project.
- [ ] Run normal Codex Connect, not a hand-edited registration.
- [ ] Record probe and Connect result/notes.
- [ ] Assert resulting Kanmer table equals canonical bytes/hash.
- [ ] Assert unrelated TOML survives and no local path/identity is serialized.
- [ ] Establish supported Codex trust.
- [ ] Invoke `get_status` from source repo.
- [ ] Assert canonical board/source roots and installed baseline server identity.
- [ ] Invoke `get_status` from linked worktree.
- [ ] Assert the same canonical project identity.
- [ ] Capture raw payloads/process chain and prove wrapper stdout cleanliness.

## Reconnect, legacy migration and disconnect

- [ ] Seed one eligible old owned machine-specific registration through the controlled fixture.
- [ ] Reconnect and assert canonical project bytes remain idempotent.
- [ ] Assert eligible legacy entry drains and unrelated registrations remain.
- [ ] Disconnect and assert only owned project/legacy state is removed.
- [ ] Disconnect again and assert no collateral change.
- [ ] Connect again and assert exact canonical hash is restored.

## Real update

- [ ] Record pre-update config/shim/registry/install hashes.
- [ ] Start a real installed MCP session through Codex.
- [ ] Confirm updater diagnostics identify the installed child, not unrelated cmd processes.
- [ ] Make the controlled newer release available through the real feed.
- [ ] Trigger update through the supported application UI/path.
- [ ] Record every updater state, session-stop result, installer log, exit and failed attempt.
- [ ] Respect documented refusal/remediation; do not bypass session/update safety.
- [ ] After success, assert new install is complete.
- [ ] Assert fixed shim/HKCU resolve the current installation.
- [ ] Assert unrelated sentinels and project config hash are unchanged.
- [ ] Start a fresh Codex host and invoke `get_status` from source.
- [ ] Assert same project identity and new server version/path/hash.
- [ ] Repeat from linked worktree.
- [ ] Assert no reconnect was needed solely due to update.

## Uninstall and expected failure

- [ ] Close running GUI/MCP sessions normally.
- [ ] Run the current normal uninstaller and record log/exit.
- [ ] Assert application payload, fixed shim and matching HKCU value are removed.
- [ ] Assert project config and unrelated sentinels remain unchanged.
- [ ] Assert parent directory/key cleanup is ownership-safe.
- [ ] Attempt a fresh post-uninstall tool launch.
- [ ] Assert clear actionable failure and no stale/alternate install selection.

## Reinstall recovery

- [ ] Reinstall new package into a second custom directory.
- [ ] Assert launcher/HKCU/probe are restored.
- [ ] Keep project config bytes unchanged.
- [ ] Invoke `get_status` from source and linked worktree successfully.
- [ ] Assert correct project and new installed server identity.
- [ ] Run final surgical Disconnect/Connect and assert canonical bytes.

## Documentation and rails

- [ ] Execute the documented existing-user migration path exactly.
- [ ] Check FRD-012, FRD-021, ADR-0012, launcher ADR, example, manual and release notes against observations.
- [ ] Record dispositions for every discrepancy and fail on blocking mismatch.
- [ ] Confirm no other provider was modified.
- [ ] Run `npm run verify`.
- [ ] Run `npm run dist:check`.
- [ ] Run manual/document checks and diff/status checks.
- [ ] Record exact exit codes/output hashes and retain failures.

## Cleanup and proof

- [ ] Remove reinstall through normal uninstaller.
- [ ] Remove disposable projects/worktrees/feed/releases/tags/users/VM state and sentinels.
- [ ] Restore legitimate pre-existing state.
- [ ] Perform final file/registry/process/config census proving no residue/secrets.
- [ ] Write proof bound to exact prerequisite/package SHAs and environment.
- [ ] Classify result PASS, FAIL or INCONCLUSIVE; do not omit attempts.

## Stop condition

- [ ] Stop after the complete clean lifecycle and proof; do not merge, implement unrelated fixes or start another ticket.

## Progress notes

Append run events and evidence references here without rewriting acceptance criteria.
