# Checklist — MCP-008

## Manifest and source contract

- [ ] Add committed `mcpb/manifest.json` source/template.
- [ ] Verify the current pinned MCPB manifest schema/tool before finalizing fields.
- [ ] Set stable Kanmer metadata, repository/author and root `icon.png`.
- [ ] Set Node server entry to `server/kanmer-mcp.cjs`.
- [ ] Add required directory `user_config.board_root`.
- [ ] State that the selected directory must directly contain `.kanmer`, normally `<repo>/.worktrees/kanmer`.
- [ ] Pass exactly `--root ${user_config.board_root}`.
- [ ] Include no repo-root/cwd/Electron/network/machine path.
- [ ] Declare Node 20 and `win32` only.
- [ ] Declare one board, not multiple roots.
- [ ] Generate/verify tool and supported prompt metadata from live protocol discovery, not a hand-maintained roster.

## Reproducible build

- [ ] Add pinned local MCPB devDependency and lockfile changes.
- [ ] Add `scripts/build-mcpb.mjs` with optional test output/staging paths.
- [ ] Read/validate version from root package.
- [ ] Build/require the canonical standalone CJS output.
- [ ] Fail clearly if server or root icon is missing.
- [ ] Clean only generated `dist/mcpb` staging/output.
- [ ] Copy server and icon byte-for-byte into exact staging paths.
- [ ] Start the staged server against a disposable board and query tools/prompts.
- [ ] Generate final staged manifest with current version/metadata.
- [ ] Assert no live tool is missing and no stale tool is declared.
- [ ] Pack with the pinned local MCPB tool.
- [ ] Emit exactly `dist/mcpb/kanmer-<version>.mcpb`.
- [ ] Print archive/server/manifest hashes and tool count.
- [ ] Do not modify the committed source manifest during build.

## MCPB sync/check rail

- [ ] Add `scripts/check-mcpb-sync.mjs`.
- [ ] Build a fresh reference package in a temporary directory.
- [ ] Unpack/inspect current and fresh archives.
- [ ] Normalize only known archive timestamps/order.
- [ ] Compare exact file set and content bytes.
- [ ] Compare server bytes to fresh standalone and plugin distributed copy through one shared helper/rail.
- [ ] Compare icon bytes to root `icon.png`.
- [ ] Validate manifest version, entry point, required root config, args, runtime, platform and one-board contract.
- [ ] Validate live tool/prompt metadata.
- [ ] Reject source maps, tests, secrets, absolute paths and extra files.
- [ ] Add fixture tests for missing/malformed/stale package cases.
- [ ] Add root scripts `mcpb:build` and `mcpb:check`.
- [ ] Integrate `mcpb:check` through CORE-031’s one `VERIFY_STEPS`, not a separate pyramid.

## Headless smoke

- [ ] Add isolated plain-Node headless smoke.
- [ ] Copy server outside repo with no reachable `node_modules`.
- [ ] Create disposable format-3 board/source fixture.
- [ ] Launch with Node 20 and explicit board root; no Electron/GUI.
- [ ] Initialize protocol and list canonical tools/prompts.
- [ ] Call `get_status` and assert selected roots/source/build identity.
- [ ] Read a real fixture ticket/document.
- [ ] Perform one controlled revision-aware write and assert exact file change.
- [ ] Assert no writes outside selected fixture.
- [ ] Exercise resource subscription/watcher fallback where supported.
- [ ] Close cleanly with no process/watch residue and remove fixture.
- [ ] Add the smoke to the shared verify steps.

## Release integration

- [ ] Rebase/sequence release changes after GUI-092 and GUI-093.
- [ ] Build the MCPB exactly once in `release.mjs` from the verified version/source.
- [ ] Validate archive name/version before publish.
- [ ] Include it in the existing publish/one-repair flow without deleting assets.
- [ ] Update release checklist/summary.
- [ ] Extend `verify-release-assets.mjs` to derive/require/hash the versioned MCPB.
- [ ] Keep `latest.yml` semantics installer-only.
- [ ] Add verifier tests for missing, wrong size/digest and correct MCPB.
- [ ] Strengthen expected-asset sanity so MCPB cannot be silently omitted.
- [ ] Confirm CORE-036’s read-only tag workflow validates it through the shared verifier.
- [ ] Confirm no second publisher/manual authoritative path was created.

## Governing docs and manual

- [ ] Amend FRD-022 headless/MCPB mode and limits.
- [ ] Amend FRD-012 install matrix for Claude Desktop MCPB.
- [ ] Correct ADR-0012 stale MCPB consequence without changing discovery order.
- [ ] Document that board worktree must already exist.
- [ ] Document tools/prompts but no Kanmer skills.
- [ ] Document one board, Node 20, win32, local stdio and no HTTP dependency.
- [ ] Document no GUI periodic Git sync/worktree creation while closed.
- [ ] Add/update Claude Desktop MCPB install/root/troubleshooting/uninstall manual.
- [ ] Update AGENTS command/release/package guidance.
- [ ] Regenerate/check the manual; do not hand-edit generated structures.

## Real Claude Desktop proof

- [ ] Name the human/operator/verifier and record OS/Claude Desktop versions.
- [ ] Build the exact clean release-candidate MCPB and record all hashes.
- [ ] Select/snapshot a real canonical board worktree and pre-test Git/file state.
- [ ] Close Kanmer GUI and prove no GUI process is running.
- [ ] Install MCPB through the supported local extension flow.
- [ ] Select the exact board root containing `.kanmer`.
- [ ] Start fresh Claude Desktop and call `get_status`.
- [ ] Assert selected project/source/server identity.
- [ ] Read one real ticket/document.
- [ ] Perform one controlled reversible write with expected project/revision where supported.
- [ ] Assert only the selected board changed.
- [ ] Restart Claude Desktop with GUI still closed and repeat status/read.
- [ ] Confirm tools/prompts and explicitly note skills are not installed.
- [ ] Confirm unsynced Git state follows documented operator responsibility.
- [ ] Uninstall MCPB, restart host and prove absence.
- [ ] Revert/remove controlled write and restore board/Git state.
- [ ] Attach raw tool results, extension state and cleanup evidence.

## Deterministic verification and scope

- [ ] Run `npm ci`, build, MCPB build/check and headless smoke.
- [ ] Run script/root tests, typecheck, manual, plugin sync and shared verify.
- [ ] Run diff/status checks.
- [ ] Confirm no server relocation, HTTP/auth/tunnel, multi-board, auto-sync/worktree creation, non-Windows, skills/signing/submission or new-tool scope entered the diff.

## Stop condition

- [ ] Stop with deterministic and real Claude Desktop proof complete and PR ready for independent review; do not merge or start GUI-075.

## Progress notes

Append measured MCPB tool/schema and real-host evidence here; never convert package validation into a substitute for the real client test.
