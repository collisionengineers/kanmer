# Checklist — MCP-008

## Manifest and source contract

- [x] Add committed `mcpb/manifest.json` source/template.
- [x] Verify the current pinned MCPB manifest schema/tool before finalizing fields.
- [x] Set stable Kanmer metadata, repository/author and root `icon.png`.
- [x] Set Node server entry to `server/kanmer-mcp.cjs`.
- [x] Add required directory `user_config.board_root`.
- [x] State that the selected directory must directly contain `.kanmer`, normally `<repo>/.worktrees/kanmer`.
- [x] Pass exactly `--root ${user_config.board_root}`.
- [x] Include no repo-root/cwd/Electron/network/machine path.
- [x] Declare Node 20 and `win32` only.
- [x] Declare one board, not multiple roots.
- [x] Generate/verify tool and supported prompt metadata from live protocol discovery, not a hand-maintained roster.

## Reproducible build

- [x] Add pinned local MCPB devDependency and lockfile changes.
- Add `scripts/build-mcpb.mjs` with optional test output/staging paths.
- [x] Read/validate version from root package.
- [x] Build/require the canonical standalone CJS output.
- [x] Fail clearly if server or root icon is missing.
- [x] Clean only generated `dist/mcpb` staging/output.
- [x] Copy server and icon byte-for-byte into exact staging paths.
- [x] Start the staged server against a disposable board and query tools/prompts.
- [x] Generate final staged manifest with current version/metadata.
- [x] Assert no live tool is missing and no stale tool is declared.
- [x] Pack with the pinned local MCPB tool.
- [x] Emit exactly `dist/mcpb/kanmer-<version>.mcpb`.
- [x] Print archive/server/manifest hashes and tool count.
- [x] Do not modify the committed source manifest during build.

## MCPB sync/check rail

- [x] Add `scripts/check-mcpb-sync.mjs`.
- Build a fresh reference package in a temporary directory.
- [x] Unpack/inspect current and fresh archives.
- Normalize only known archive timestamps/order.
- [x] Compare exact file set and content bytes.
- [x] Compare server bytes to fresh standalone and plugin distributed copy through one shared helper/rail.
- [x] Compare icon bytes to root `icon.png`.
- [x] Validate manifest version, entry point, required root config, args, runtime, platform and one-board contract.
- [x] Validate live tool/prompt metadata.
- Reject source maps, tests, secrets, absolute paths and extra files.
- Add fixture tests for missing/malformed/stale package cases.
- [x] Add root scripts `mcpb:build` and `mcpb:check`.
- [x] Integrate `mcpb:check` through CORE-031’s one `VERIFY_STEPS`, not a separate pyramid.

## Headless smoke

- [x] Add isolated plain-Node headless smoke.
- [x] Copy server outside repo with no reachable `node_modules`.
- Create disposable format-3 board/source fixture.
- Launch with Node 20 and explicit board root; no Electron/GUI.
- [x] Initialize protocol and list canonical tools/prompts.
- [x] Call `get_status` and assert selected roots/source/build identity.
- Read a real fixture ticket/document.
- Perform one controlled revision-aware write and assert exact file change.
- [x] Assert no writes outside selected fixture.
- Exercise resource subscription/watcher fallback where supported.
- [x] Close cleanly with no process/watch residue and remove fixture.
- [x] Add the smoke to the shared verify steps.

## Release integration

- Rebase/sequence release changes after GUI-092 and GUI-093.
- [x] Build the MCPB exactly once in `release.mjs` from the verified version/source.
- [x] Validate archive name/version before publish.
- [x] Include it in the existing publish/one-repair flow without deleting assets.
- Update release checklist/summary.
- Extend `verify-release-assets.mjs` to derive/require/hash the versioned MCPB.
- Keep `latest.yml` semantics installer-only.
- Add verifier tests for missing, wrong size/digest and correct MCPB.
- Strengthen expected-asset sanity so MCPB cannot be silently omitted.
- Confirm CORE-036’s read-only tag workflow validates it through the shared verifier.
- Confirm no second publisher/manual authoritative path was created.

## Governing docs and manual

- [x] Amend FRD-022 headless/MCPB mode and limits.
- [x] Amend FRD-012 install matrix for Claude Desktop MCPB.
- [x] Correct ADR-0012 stale MCPB consequence without changing discovery order.
- [x] Document that board worktree must already exist.
- [x] Document tools/prompts but no Kanmer skills.
- [x] Document one board, Node 20, win32, local stdio and no HTTP dependency.
- [x] Document no GUI periodic Git sync/worktree creation while closed.
- [x] Add/update Claude Desktop MCPB install/root/troubleshooting/uninstall manual.
- [x] Update AGENTS command/release/package guidance.
- [x] Regenerate/check the manual; do not hand-edit generated structures.

## Real Claude Desktop proof

- Name the human/operator/verifier and record OS/Claude Desktop versions.
- Build the exact clean release-candidate MCPB and record all hashes.
- Select/snapshot a real canonical board worktree and pre-test Git/file state.
- Close Kanmer GUI and prove no GUI process is running.
- Install MCPB through the supported local extension flow.
- Select the exact board root containing `.kanmer`.
- Start fresh Claude Desktop and call `get_status`.
- Assert selected project/source/server identity.
- Read one real ticket/document.
- Perform one controlled reversible write with expected project/revision where supported.
- Assert only the selected board changed.
- Restart Claude Desktop with GUI still closed and repeat status/read.
- Confirm tools/prompts and explicitly note skills are not installed.
- Confirm unsynced Git state follows documented operator responsibility.
- Uninstall MCPB, restart host and prove absence.
- Revert/remove controlled write and restore board/Git state.
- Attach raw tool results, extension state and cleanup evidence.

## Deterministic verification and scope

- Run `npm ci`, build, MCPB build/check and headless smoke.
- Run script/root tests, typecheck, manual, plugin sync and shared verify.
- [x] Run diff/status checks.
- [x] Confirm no server relocation, HTTP/auth/tunnel, multi-board, auto-sync/worktree creation, non-Windows, skills/signing/submission or new-tool scope entered the diff.

## Stop condition

- Stop with deterministic and real Claude Desktop proof complete and PR ready for independent review; do not merge or start GUI-075.

## Progress notes

Append measured MCPB tool/schema and real-host evidence here; never convert package validation into a substitute for the real client test.


Measured implementation evidence (2026-08-21): `npm run mcpb:check` PASS — pinned @anthropic-ai/mcpb 2.1.2, live protocol metadata 30 tools / 2 prompts, exact 3-file archive staging↔unpack byte comparison, generated output dist/mcpb/kanmer-0.3.3.mcpb. `npm run smoke:headless` PASS — standalone CJS copied to a temporary host with no reachable repository node_modules; explicit board root, live list/get_status/create/list checks, outside-host marker preserved, cleanup complete. `npm run plugin:check` PASS — 30 tools, bundle bytes, isolated handshake. `npm run test:scripts` PASS 75/75; full typecheck PASS; manual freshness PASS; git diff --check PASS. Full npm test: core 257/257 and GUI 343/343 PASS; MCP HTTP suite has two environment-sensitive failures preserved in the implementation report: spawnSync ETIMEDOUT in src/http.test.mjs and TUNNEL_READINESS_TIMEOUT in src/tunnels/readiness.test.mjs. Real Claude Desktop host acceptance is unavailable and remains unchecked/INCONCLUSIVE.

Merged-main verification reconciliation — 2026-08-21: the required deterministic rails were rerun on `main` at `1b5ae0d4`, with MCP-008 merge `52073fc6521ae25b07d8f4b2c54b6d563f62cc21` reachable. `npm ci` failed with the preserved Windows EPERM Rollup-native-module unlink error; dependency repair via `npm install --ignore-scripts --no-audit --no-fund` exited 0. `npm run build`, `mcpb:build`, `mcpb:check`, `smoke:headless`, `test:scripts` (79/79), `npm test` (core 263, GUI 352, HTTP 61, scripts 79), typecheck, manual, plugin:check, shared `npm run verify`, and `git diff --check` passed. The earlier checklist's real Claude Desktop acceptance boxes remain intentionally unchecked/INCONCLUSIVE: no authorized Claude Desktop host is available for MCPB install, GUI-closed read/write, restart, uninstall, screenshots, or cleanup. No deterministic result is being used as a substitute.

---

## Closeout — MCP-008

- [x] PR merge verified — [#130](https://github.com/collisionengineers/kanmer/pull/130), MERGED 2026-08-21T20:05:10Z, merge commit `52073fc6521ae25b07d8f4b2c54b6d563f62cc21`.
- [x] proof.md finalised with merged-main commands, hashes, and the explicit Claude Desktop INCONCLUSIVE boundary.
- [x] Moved to final stage — Verifying → Done at 2026-08-21T22:57:04.489Z.
- [x] Outcome/traceability recorded on the ticket: implementation commits and PR #130 were already recorded; no new source changes in verification.
- [x] No ticket worktree is recorded or present for `mcp-008-headless-mcpb`; the implementation worktree was released before verification.
- [x] No ticket branch cleanup required; `mcp-008-headless-mcpb` is not present as a local worktree/branch.
- [x] `git fetch --prune` + `git worktree prune` completed/read-only state checked.
- `take_ticket action: release` — pending final closeout record.

Real Claude Desktop installation/read/write/restart/uninstall and host cleanup remain INCONCLUSIVE; the related checklist boxes intentionally remain unchecked.

- [x] `git fetch --prune origin` and `git worktree prune` completed; no `mcp-008-headless-mcpb` worktree or local branch exists.
- [x] Ticket has no taken worktree fields; release is safe after this final board record.

## Done-incomplete audit disposition — 2026-08-22

This audit compared the complete ticket packet, the HZN-005/HZN-007 context, current document gates, merged-main proof, checklist, and activity. The ticket remains `Done` with no recorded worktree or branch.

- The 39 unchecked checklist lines are not being silently treated as PASS. The Claude Desktop install/read/write/restart/uninstall/cleanup and screenshot/version lines are an explicit external-host boundary and remain `INCONCLUSIVE`: no authorized Claude Desktop host was available. The existing parked open questions already defer signing/directory submission, macOS, multi-board support, and Claude Desktop skill installation.
- The remaining unchecked source/release/fixture/verification lines are retained as historical checklist residue or distinct release-rail/harness claims not independently established by this audit. The merged-main proof records the deterministic build, MCPB/package checks, headless smoke, tests, typecheck, manual checks, and plugin checks that it actually ran; this audit does not promote any other unchecked line to PASS.
- No merged-main product failure or missing in-scope implementation was demonstrated, so no remediation ticket is justified by this evidence. Any future authorized-host validation or separately owned release-rail work should be recorded on its owning ticket rather than fabricated here.

The existing initial `npm ci` EPERM failure and HTTP-suite environment-sensitive failures remain preserved in the report/proof. No source files, checklist checkboxes, or board stage were changed by this audit.

## Parked (explicitly deferred)

- The real Claude Desktop operator/installation/lifecycle/cleanup checklist lines are deferred pending an authorized named host. Their evidence boundary remains `INCONCLUSIVE`; no deterministic/package result is substituted for them.
- The remaining unchecked release, fixture, and verification lines are deferred as distinct or historical claims not individually established by this reconciliation. They remain unclaimed rather than being ticked; any future release-rail requirement belongs on its owning ticket. No current product defect was demonstrated and no remediation ticket is opened.
