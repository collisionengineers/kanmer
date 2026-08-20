# Plan — GUI-101: Portable registration packaging and real-host verification

## Objective

Turn the GUI-099 launcher and GUI-100 registration contracts into release-quality evidence: make `npm run dist:check` fail when the packaged application cannot install the stable launcher, then prove on real packaged Windows installations that one unchanged Codex project registration reaches the correct project before and after an application update and from two differently located environments.

## Starting state

- GUI-099 owns the fixed shim/HKCU/NSIS lifecycle and basic installer tests.
- GUI-100 owns the canonical rootless project TOML, preflight, migration and provider regressions.
- `check-updater-package.mjs` is the existing packaged-output gate but does not yet know the launcher contract.
- `.codex/config.toml` remains ignored and should become shareable only after real evidence.
- Update safety stops live installed MCP processes before applying an NSIS update; continuity is proven with a fresh host after update, not by preserving one process.

## Approach

Extend the existing package rail rather than create a parallel verifier. Add a narrow session-process regression if needed. Use disposable/snapshotted Windows installations to run the exact packaged path: install old version, Connect, call `get_status`, update to new version, start a fresh host, call the same tool with the unchanged config, and compare identities. Repeat the canonical config/tool call in a second path/user environment. Only after success make the Codex project file intentionally shareable and document the one-time migration.

## Governing docs

- **EPIC-011 `context.md` — Meets.** Proves packaging/update and cross-location properties required by the portable-registration outcome.
- **MASTERPLAN.md §6.3 S-25 — Meets.** Extends `dist:check` and attaches real-host register/update/connect evidence.
- **FRD-012 — Modifies with roadmap authorization.** Add packaged acceptance, shareable-config result and migration instructions after evidence.
- **FRD-021 — Modifies with roadmap authorization.** Add stable-launcher continuity and fresh-session post-update proof while preserving stop-before-install safety.
- **ADR-0012 and GUI-099 launcher ADR — Meets.** Validate inherited cwd/discovery and installed indirection; do not change either decision.
- Link the launcher ADR when available and clear `docs_todo` before leaving Preparing/review.

## Required changes

### 1. Verify prerequisites and freeze the evidence matrix

1. Confirm GUI-099 and GUI-100 are merged and their proof identifies exact launcher path/key, registration bytes and probe behavior.
2. Compute/store expected canonical config SHA-256 from GUI-100's exact fixture; use that same byte sequence in every real environment.
3. Select two safe Windows environments with different user profile paths, install directories and repository paths; document whether they are separate machines, VMs or disposable users.
4. Select an old/new package pair using a controlled update feed that exercises the real electron-updater/NSIS path without risking the operator's current installation.
5. Record cleanup/restore procedures before installing anything.

### 2. Extend the packaged-output gate

6. Inspect GUI-099's final `electron-builder.yml`, shim and NSIS include; derive assertions from the implementation rather than a stale draft.
7. Extend `scripts/check-updater-package.mjs` within its existing failure collector and numbering/comment style.
8. Assert `release/win-unpacked/kanmer-mcp.cmd` exists.
9. Read the packaged shim and assert load-bearing markers:
   - exact HKCU key/value name;
   - system `reg.exe` path;
   - `Kanmer.exe` and `resources\mcp\kanmer-mcp.cjs` targets;
   - `ELECTRON_RUN_AS_NODE=1`;
   - `--probe` support;
   - no repository/build-user absolute path.
10. Assert `electron-builder.yml` points `nsis.include` at the expected installer hook and packages the shim with `extraFiles`.
11. Assert the included NSIS source contains both install and uninstall hooks plus ownership comparison before deletion.
12. Retain all existing updater/feed/asar/elevation/MCP/plugin assertions and one final non-zero exit; do not split launcher checks into another release command.
13. Update the reported assertion count/headings accurately.
14. Add a focused dependency-free script test using temporary synthetic `win-unpacked`/config fixtures if practical; cover missing shim, malformed shim, missing include, missing bundle and a healthy fixture.
15. Do not make fixture tests replace the full `dist:check` packaged run.

### 3. Pin updater session compatibility

16. Capture the actual process chain from a packaged launcher-started MCP session.
17. Add a shared parser/session test with:
   - parent `cmd.exe` containing the fixed shim;
   - child installed `Kanmer.exe` command line containing `kanmer-mcp.cjs`;
   - an unrelated `cmd.exe` decoy.
18. Assert only the installed child is counted/stoppable by install-directory prefix and bundle command line.
19. Modify production session detection only if the real chain is missed; if changed, preserve unknown/fail-closed install behavior and add regression tests.
20. Do not classify all shim/cmd processes or kill by parent name alone.

### 4. Build and inspect the package

21. Run the full build prerequisites and `npm run dist:check` from a normal main checkout/clean implementation branch as required by the release rail.
22. Record old/new package version, commit/tag, installer path, SHA-256, `latest.yml` hash and complete package-check output.
23. Inspect `win-unpacked` and installer inputs and confirm no source checkout, username or development Node dependency is required.
24. Run the packaged shim probe directly after installation, not only against unpacked files.

### 5. Prove environment A before update

25. In environment A, install the old/test baseline into a custom path.
26. Update/install the implementation package or arrange the controlled old→new feed according to the selected safe sequence.
27. Ensure the project is trusted by Codex through its supported trust mechanism.
28. Use the GUI's normal Connect flow to write/replace the Kanmer entry; do not copy a hand-edited variant for the first registration.
29. Capture the exact `.codex/config.toml` bytes/hash and assert they match the canonical fixture and contain no environment A paths.
30. Start a fresh Codex host from the source repo and invoke Kanmer `get_status`.
31. Assert `projectRoot` is the repo's canonical Kanmer board worktree, `repoRoot` is the source repo, root sources are discovery-based, and server path/hash/version identify the installed baseline build.
32. Repeat from one linked ticket worktree and prove discovery returns the same canonical board/source pair.

### 6. Prove installed update continuity

33. Leave the project config unchanged and capture its pre-update hash.
34. Start an installed MCP session so updater session detection has a real target; record its process chain.
35. Trigger the real application update through the supported updater UI/API path and record session-stop result, download/install logs and old/new package identities.
36. Confirm update either safely stops the session and installs or refuses with the documented actionable state; do not force-kill/hand-copy files around a refusal.
37. After successful update, verify the fixed shim and HKCU now resolve the new complete installation and the config hash is unchanged.
38. Start a fresh Codex host from the same project and invoke `get_status` again.
39. Assert project/board identity is unchanged, while `server.version/path/sha256` identify the new packaged build.
40. Confirm no reconnect or config rewrite was needed solely because the install directory/version changed.
41. Confirm normal uninstall/repair behavior from GUI-099 remains intact after the updater path.

### 7. Prove environment B portability

42. In environment B, use a different Windows username/profile, selected install directory and source-repo path.
43. Install the same new package through the normal installer.
44. Copy the exact canonical project config bytes or run Connect and prove it produces the same SHA-256; do not adapt paths.
45. Trust the project and invoke `get_status` from its source root and a linked worktree.
46. Assert project/root identity describes environment B, server identity describes its installed package, and the config contains no environment A or B local paths.
47. Record both config hashes and a byte comparison.

### 8. Make the portable file intentionally shareable

48. Only after steps 25–47 pass, remove the single `.codex/config.toml` line from `.gitignore`.
49. Rewrite the adjacent comment: Codex project config is portable/shareable after this release; `.mcp.json`, Grok/OpenCode/Antigravity config and copied skills remain machine-local.
50. Update the provider ignore-rule test so exactly this file is exempted; retain every other expected ignore.
51. Do not blanket-unignore `.codex/`, auto-add/commit consumer files or edit a consumer repository.

### 9. Update docs and release guidance

52. Amend FRD-012 acceptance with two-location packaged tool calls, unchanged registration through update and config-shareability decision.
53. Amend FRD-021 with stable launcher continuity, process-stop expectation and fresh-host post-update proof.
54. Update release notes with one-time migration:
   - update/install Kanmer;
   - reconnect Codex project once to replace an old absolute owned entry;
   - review and commit/untrack the project file according to repository policy;
   - restart the Codex host;
   - no other provider reconnect is required.
55. Update the manual's Connect/update troubleshooting and regenerate through `build-manual.mjs`.
56. Do not claim automatic consumer Git migration or non-Windows support.

### 10. Record evidence and hand off

57. Attach/record exact package hashes, config hashes, registry/shim state, process chain, updater logs, before/after status payloads and cleanup commands.
58. Classify any failure as package input, launcher lifecycle, registration, discovery, updater session, or environment issue; do not blur an inconclusive attempt into PASS.
59. Restore/remove test installations, feeds, releases, registry values, users/VM snapshots and temporary repositories according to the pre-recorded cleanup plan.
60. Stop before running GUI-102's final combined acceptance or merging.

## Expected files

Modify:
- `scripts/check-updater-package.mjs`
- `apps/gui/src/shared/mcp-sessions.test.ts`
- `.gitignore` (only after proof)
- `apps/gui/src/main/providers.test.ts`
- `docs/functional/frd/FRD-012-connect.md`
- `docs/functional/frd/FRD-021-auto-update.md`
- `apps/gui/release-notes.md`
- relevant manual source/generated output through generator

Add if needed:
- `scripts/check-updater-package.test.mjs`

Expected no production change unless evidence requires it:
- `apps/gui/src/main/mcp-sessions.ts`
- `apps/gui/src/shared/mcp-sessions.ts`

## Do not modify

- Canonical launcher/registration behavior owned by GUI-099/100 without an explicit deviation.
- Release publishing, update feed format, signing, asset names or other providers.
- Consumer repositories/Git history automatically.
- Final epic integration steps owned by GUI-102.

## Acceptance checks

- `dist:check` detects every missing/malformed launcher package prerequisite and remains green on a valid package.
- Real installed launcher/session shape remains compatible with updater safety.
- One unchanged canonical config calls `get_status` before and after a real installed update.
- Project identity stays correct; server identity advances to the new build.
- A second user/install/repo path uses byte-identical config and successfully calls the tool.
- `.codex/config.toml` becomes the only newly shareable Connect-owned config, only after evidence.
- Migration/release/manual guidance is exact and no other provider changes.
- Evidence and cleanup are complete and reproducible.

## Verification commands

```bash
npm run test:scripts
npm run test -w @kanmer/gui
npm run test -w @kanmer/core
npm test
npm run typecheck
npm run dist:check
npm run check:manual
node scripts/check-doc-numbering.mjs
git diff --check
git status --short
```

Real-host evidence:

```text
environment A: install/register/get_status → real updater → fresh host/get_status
linked worktree discovery before/after
process-session stop evidence
environment B: different user/install/repo → same config bytes → get_status
cleanup/restore log
```

## Failure and deviation rules

- If GUI-099/100 are not merged/proven, stop; do not recreate their implementations.
- If the update cannot be tested safely, mark real-host proof inconclusive and keep `.codex/config.toml` ignored.
- If a config byte changes across environments, stop and trace the machine-derived field before documenting portability.
- If updater session detection misses the installed child, make the smallest tested correction or return it to its owner; never bypass the stop gate.
- Do not convert a failed first attempt into PASS without retaining both attempts and cause.
- Do not merge or start GUI-102.

## Stop condition

Stop when the package rail, process regression and governing/release/manual changes are complete; two-location packaged proof and a real update prove unchanged registration continuity; test state is cleaned up; all deterministic commands pass; and the PR is ready for independent review. Do not merge or begin GUI-102.
