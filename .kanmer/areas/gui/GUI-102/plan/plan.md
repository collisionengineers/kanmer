# Plan — GUI-102: Portable Connect integration verification

## Objective

Execute and record the final Portable Codex Connect acceptance on a clean packaged Windows lifecycle: fresh install, normal GUI registration, real tool calls from source and linked worktree, real application update with unchanged registration bytes, surgical disconnect/reconnect, safe uninstall, actionable post-uninstall failure, reinstall recovery and complete cleanup. Produce evidence sufficient to close EPIC-011 without adding new architecture.

## Starting state

- GUI-099 should have shipped/proven the fixed installer-owned shim and HKCU lifecycle.
- GUI-100 should have shipped/proven canonical registration bytes, preflight, migration and disconnect.
- GUI-101 should have shipped/proven package assertions, two-location portability and installed-update continuity.
- This ticket is blocked by GUI-100 and GUI-101 and must also treat GUI-099 as a practical prerequisite through those dependencies.
- The integration profile is `chore`: implementation is primarily orchestration and evidence, but the user-requested full document packet defines exact execution.

## Approach

Use one disposable/snapshotted Windows environment with zero prior state and one controlled repository containing a canonical board worktree plus a linked ticket worktree. Add unrelated sentinel config/files/registry values so ownership can be proven. Execute one continuous old→new packaged lifecycle using normal GUI/host operations. Bind every observation to exact versions, commits, hashes, paths and exit codes. Any prerequisite defect returns to its owner; this ticket does not become a fifth implementation project.

## Governing docs

- **EPIC-011 `context.md` — Acceptance owner.** PASS closes the group outcome: byte-identical registration survives machine move and app update.
- **MASTERPLAN.md §6.3 S-26 — Meets.** Fresh install → registration → app update → live unchanged registration → uninstall cleanup, with migration note and command/registry/file proof.
- **FRD-012 / FRD-021 / ADR-0012 / launcher ADR — Verify, do not redesign.** Every observed behavior is checked against the merged versions; a mismatch is a prerequisite defect.
- **GUI-099/100/101 approved plans and reports — Inputs.** Record their exact merged SHAs and do not begin before all prerequisite acceptance is complete.

## Required changes and ordered run

### 1. Gate the run on immutable prerequisites

1. Read GUI-099, GUI-100 and GUI-101 ticket/PR state and record merged commit SHAs.
2. Verify their post-implementation reports and proof contain PASS (not INCONCLUSIVE/waiver) for their owned contracts.
3. Verify the release package under test contains those exact merged commits and its version/manifests agree.
4. Run the deterministic root verification and `dist:check`; stop on any failure.
5. Freeze the exact canonical Codex config fixture/hash from GUI-100 and the expected fixed launcher/HKCU contract from GUI-099.
6. Create an integration run identifier and log file; no subsequent step reuses ambiguous “latest” artifacts.

### 2. Prepare a clean, reversible environment

7. Use a disposable Windows VM/user or create a complete snapshot/restore plan.
8. Record OS/build, architecture, local time zone, user profile path, relevant environment variables and Codex/Kanmer host versions.
9. Assert no installed Kanmer process/session, `%LOCALAPPDATA%\Kanmer\bin\kanmer-mcp.cmd`, `HKCU\Software\Kanmer\InstallDir`, source install directory or project Kanmer entry exists.
10. Record any legitimate pre-existing state instead of deleting it blindly; abort or snapshot before proceeding.
11. Create an unrelated sentinel file under `%LOCALAPPDATA%\Kanmer` and unrelated sentinel registry value under `HKCU\Software\Kanmer`.
12. Create a disposable Git source repo with:
    - a valid `.worktrees/kanmer/.kanmer` board worktree;
    - at least one linked ticket worktree;
    - `.codex/config.toml` containing unrelated top-level/TOML/MCP content but no Kanmer entry.
13. Record the complete pre-run file/registry/process/config census and hashes.

### 3. Fresh-install the baseline package

14. Install the baseline packaged version through the actual NSIS installer into a non-default custom directory containing spaces.
15. Record installer command, exit code, log, installed file listing and package hash.
16. Assert the fixed LOCALAPPDATA shim exists and hash matches the packaged expected bytes.
17. Assert HKCU `InstallDir` equals the selected custom directory.
18. Assert installed `Kanmer.exe` and `resources\mcp\kanmer-mcp.cjs` exist.
19. Run the installed shim `--probe`; record stdout/stderr/exit.
20. Assert sentinel file/value remain unchanged.

### 4. Register through the normal GUI and prove project discovery

21. Open the installed Kanmer GUI against the disposable repository through the supported project selection path.
22. Confirm Connect shows Codex and run its normal Connect action; do not hand-edit the Kanmer entry.
23. Record the launcher preflight result and resulting `ConnectResult`/notes.
24. Read the resulting `.codex/config.toml` bytes.
25. Assert the owned Kanmer entry equals the canonical fixture, its hash is exact, unrelated TOML survives and no local username/drive/install/repo/board/server path appears.
26. Record Codex trust state and establish trust through the supported user-controlled mechanism if required.
27. Start a fresh Codex host from the source repo and invoke Kanmer `get_status`.
28. Assert:
    - the call succeeds through the installed launcher;
    - `projectRoot` is the canonical board worktree;
    - `repoRoot` is the disposable source repo;
    - root sources reflect discovery, not serialized root flags;
    - server path/version/hash identify the installed baseline package.
29. Start a fresh host from the linked ticket worktree and repeat; assert it resolves the same canonical project/source pair.
30. Capture raw payloads and process chain; prove normal MCP stdout was not contaminated by wrapper text.

### 5. Exercise idempotent reconnect and legacy migration

31. Seed one eligible old machine-specific Kanmer registration through the documented test/fixture path without replacing unrelated global entries.
32. Run Connect again.
33. Assert project config bytes remain canonical/idempotent.
34. Assert the eligible old owned entry is drained through the existing surgical route and unrelated registrations remain.
35. Run Disconnect and assert only the project Kanmer table/eligible legacy entry is removed; unrelated TOML and installed launcher remain.
36. Run Disconnect a second time and assert no collateral change/error.
37. Run Connect again and assert canonical bytes/hash are restored exactly.

### 6. Exercise a real installed update

38. Record pre-update config/shim/registry/install hashes and start a real installed MCP session through Codex.
39. Confirm updater session diagnostics identify the installed MCP child and not unrelated `cmd.exe` processes.
40. Make the controlled newer release available through the actual configured update feed.
41. Trigger check/download/restart-install through the supported application updater entrance.
42. Record every attempt, updater state transition, session-stop result, installer log and exit code.
43. If the updater refuses because sessions remain/are unknown, treat that as correct safety, close/remediate according to the documented operator path and retry while retaining the failed attempt.
44. Do not force-copy files, invoke the installer behind the updater, or weaken session protection to manufacture success.
45. After successful update, assert:
    - new installed version/files are complete;
    - fixed shim path remains the same and has expected current bytes;
    - HKCU points to the current installation;
    - sentinel file/value remain;
    - project config hash is unchanged.
46. Start a fresh Codex host from the source repo and invoke `get_status`.
47. Assert project/board roots are identical to pre-update values and server path/version/hash identify the new packaged build.
48. Repeat from linked worktree.
49. Confirm no Connect/rewrite was necessary solely due to app update.

### 7. Prove uninstall ownership and post-uninstall behavior

50. Record current owned/unrelated state and close running GUI/MCP sessions normally.
51. Run the current package's normal uninstaller and capture log/exit.
52. Assert installed application payload is removed.
53. Assert fixed shim and matching HKCU `InstallDir` are removed.
54. Assert unrelated sentinel file/value and project `.codex/config.toml` remain unchanged.
55. Assert parent directories/registry key remain only where unrelated state requires them.
56. Start a fresh Codex host and attempt the Kanmer tool.
57. Assert failure is clear/actionable and cannot silently select a stale/other installation; record exact stderr/host diagnostic.
58. Do not classify expected post-uninstall failure as an integration failure.

### 8. Prove reinstall recovery

59. Reinstall the new package into a second custom directory.
60. Assert launcher/HKCU ownership is recreated and probe succeeds.
61. Without changing project config bytes, start a fresh Codex host and invoke `get_status` from source and linked worktree.
62. Assert successful correct project identity and new installed server identity.
63. Run normal Disconnect and Connect once more to prove surgical ownership after reinstall.

### 9. Validate documentation and migration path

64. Walk the released manual/release-note migration exactly as an existing user:
    - install/update;
    - reconnect once to replace old absolute entry;
    - review portable diff and repository policy;
    - restart host.
65. Confirm every command/path/expected state in FRD-012, FRD-021, launcher ADR, manual, example and release notes matches observation.
66. Record dispositions for discrepancies; blocking discrepancies fail the run and return to the owning ticket.
67. Confirm other providers were neither registered nor modified by the lifecycle.

### 10. Run final rails and clean up

68. Run the exact repository verification commands against the merged prerequisite SHA/package source.
69. Record exit codes/output hashes and retain failed attempts.
70. Remove the reinstall through normal uninstaller.
71. Remove only disposable project/worktrees, test feed/releases/tags, VM/user and sentinel state according to plan.
72. Restore any legitimate pre-existing state and perform a final census proving no test secret/install/process/registry residue remains.
73. Write `proof/proof.md` with merged prerequisite/package SHAs, environment, PASS/FAIL/INCONCLUSIVE and every attempt/reference.
74. Stop; do not merge code, begin another ticket or declare PASS with a missing lifecycle segment.

## Expected files

Normally no production source changes.

Write/update through Kanmer/evidence process:
- `proof/proof.md`
- command/process/registry/file/config/tool-call logs or linked evidence artifacts
- documentation finding dispositions if any

A production diff is allowed only through a separately owned/linked blocking fix when the integration run exposes a defect.

## Do not modify

- Launcher, registration, package/update or provider architecture inside this ticket without explicit rescope.
- Consumer Git history automatically.
- Other providers, non-Windows support, signing policy, remote access or release publishing.
- Prerequisite ticket stages/proof to hide a failed integration.

## Acceptance checks

- Clean environment and exact prerequisite/package identities are recorded.
- Fresh install creates only the expected launcher/HKCU/install state.
- Normal GUI Connect produces canonical bytes and real `get_status` calls from source/linked worktree.
- Reconnect/disconnect/legacy migration are idempotent and surgical.
- Real updater safely handles live session and unchanged config reaches the new server.
- Uninstall removes owned state, preserves project/unrelated state and yields actionable expected launch failure.
- Reinstall restores operation without config changes.
- Documentation/migration is executable and accurate.
- Full deterministic rail is green, all attempts are retained and cleanup is complete.

## Verification commands

```bash
npm run verify
npm run dist:check
npm run check:manual
node scripts/check-doc-numbering.mjs
git diff --check
git status --short
```

Plus the numbered installed-host lifecycle above, with raw command logs and exact hashes.

## Failure and deviation rules

- Stop before setup if any prerequisite is unmerged/unproven or the package does not contain its exact commits.
- A missing real tool call, updater transition, uninstall or reinstall makes the result INCONCLUSIVE, never PASS.
- Return defects to GUI-099/100/101 ownership and rerun from a clean snapshot after fixes.
- Preserve failed attempts and do not bypass safety rails.
- Do not merge or start another ticket.

## Stop condition

Stop when one clean packaged lifecycle has passed every numbered acceptance segment, documentation matches observed behavior, proof is bound to exact commits/package/environment, cleanup is independently censused, and EPIC-011 is ready for human closure. Do not merge, implement unrelated fixes or begin another ticket.
