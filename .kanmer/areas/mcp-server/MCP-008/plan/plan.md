# Plan — MCP-008: Headless board serve and Claude Desktop MCPB

## Objective

Ship one reproducible Windows MCPB package that runs Kanmer’s existing standalone stdio server under Claude Desktop with the GUI closed, asks the user for one explicit board root, exposes the same tools/prompts as the normal server, participates in the canonical verification/release rails, and is proven against a real Claude Desktop installation.

## Starting state

- The standalone CJS build already bundles core, MCP SDK and runtime dependencies into one Node 20 file.
- Earlier research proved that file runs from an isolated directory with no Electron and no reachable workspace `node_modules`.
- MCP-010 discovery is complete, but Claude Desktop has no reliable project cwd. MCPB therefore requires an explicit directory containing `.kanmer`.
- MCP-005 is archived; no server relocation is required.
- No MCPB source/build/check/release asset currently exists.
- The GUI creates/syncs the canonical board worktree, but headless mode has no GUI timer or worktree creation.
- CORE-031/036 and GUI-092/093 define the verification and release-owner boundaries this ticket must join.

## Approach

Keep the server unchanged. Add a committed MCPB manifest source, a deterministic build script that queries the freshly built server for its actual tool metadata, a content-based sync checker, an isolated headless protocol smoke and manual/FRD guidance. Package the existing standalone CJS plus canonical root icon through a pinned local MCPB devDependency. Integrate the versioned archive into the one release publisher and one asset verifier after the release fixes land. Prove the result in real Claude Desktop with the GUI closed.

## Governing docs

- **FRD-022 — Modifies with existing ticket authority.** Add headless/MCPB supported mode, explicit root, same tool surface, isolated runtime proof and GUI-closed limits.
- **FRD-012 — Modifies.** Add Claude Desktop MCPB to the provider/install matrix and distinguish it from GUI Connect, Claude Code plugin and Streamable HTTP.
- **ADR-0012 — Meets and corrects stale consequence prose.** MCPB intentionally asserts an explicit board root; no cwd discovery is expected.
- **FRD-020 — Meets.** Git auto-sync remains GUI-owned. Do not implement a headless committer.
- **MASTERPLAN 0.4.1 MCP-008 rescope — Meets.** Headless server + `.mcpb`; no runtime-relocation dependency; relates to but does not duplicate MCP-025.
- **CORE-031/036 and GUI-092/093 — Integrates.** One verify list, one publisher, one resilient publish/asset verifier.

## Required changes

### 1. Freeze package layout and metadata

1. Add committed `mcpb/manifest.json` as a source/template, not generated release output.
2. Use the current MCPB manifest version supported by the pinned build tool; verify schema locally rather than guessing.
3. Set stable package metadata:
   - name/id `kanmer`;
   - display name and concise headless-board description;
   - author/homepage/repository fields already used by project metadata;
   - icon `icon.png`;
   - version supplied/validated from root `package.json` at build time.
4. Define server type `node` and entry point `server/kanmer-mcp.cjs`.
5. Define `user_config.board_root` as required `directory` with help text: “Select the folder that directly contains `.kanmer`; for a GUI-created project this is normally `<repo>/.worktrees/kanmer`.”
6. Pass exactly `--root` and `${user_config.board_root}` in server MCP args.
7. Include no `--repo-root`, cwd, install/source path, Electron environment or network endpoint.
8. Declare Node 20 runtime and `win32` compatibility only.
9. State one configured extension instance serves one board; do not use `multiple:true`.
10. Do not hand-write a permanent tools array. Mark/generate the tool metadata section through the build process from the actual server registry.
11. Include existing MCP prompts where the MCPB schema supports them, deriving/validating them from actual protocol discovery rather than another static list.

### 2. Add reproducible build tooling

12. Add pinned `@anthropic-ai/mcpb` (or the exact current package name exposed by the verified CLI) to root devDependencies and lockfile.
13. Add `scripts/build-mcpb.mjs` using only Node built-ins plus the local package binary/API.
14. Accept optional output/staging arguments for tests, defaulting to `dist/mcpb/`.
15. Read root package version and validate it is a release-compatible semver.
16. Require or invoke the canonical MCP standalone build; do not compile a second server configuration.
17. Require `packages/mcp-server/dist/standalone/kanmer-mcp.cjs` and root `icon.png`; fail with exact commands/paths when absent.
18. Create/clean only `dist/mcpb/staging` and its versioned archive output; never delete unrelated `dist` files.
19. Copy the standalone server to `staging/server/kanmer-mcp.cjs` byte-for-byte.
20. Copy root `icon.png` to `staging/icon.png` byte-for-byte.
21. Start the staged server against a temporary disposable board through the MCP protocol, call `initialize`, `tools/list` and available prompt listing, and capture canonical names/descriptions/schema summaries required by the manifest.
22. Generate final staged `manifest.json` by replacing only declared generated fields (version/tool/prompt metadata) in the source template.
23. Validate every declared tool exists in the live list and no live tool is omitted where the MCPB schema expects the full list.
24. Invoke the pinned local MCPB packer against staging and emit `dist/mcpb/kanmer-<version>.mcpb`.
25. Refuse a differently named/versioned archive, stale manifest version or payload mismatch.
26. Print archive path, size, SHA-256, server SHA-256, manifest version/tool count and exact remediation commands.
27. Do not modify/commit the source manifest during a normal build.

### 3. Add MCPB content/sync verification

28. Add `scripts/check-mcpb-sync.mjs`.
29. Build a fresh reference package into a temporary directory using the same build entry point.
30. Locate the repository/current expected MCPB output and fail clearly if it has not been built.
31. Unpack/inspect both archives using the pinned tool or ZIP reader already supplied by it; do not add another archive dependency unless necessary.
32. Normalize only known nondeterministic archive metadata such as timestamps/order; compare actual file set and content bytes.
33. Assert exactly the expected package files and no source map, test fixture, secret, absolute path or workspace dependency.
34. Compare server bytes to the fresh standalone build and the plugin copy through one shared hash helper/rail.
35. Compare icon bytes to root `icon.png`.
36. Parse manifest and assert:
   - version equals root package;
   - entry point exists;
   - required board-root config/interpolation is exact;
   - no cwd/root alternatives or machine paths;
   - Node 20/win32/one-board contract;
   - live tool/prompt metadata matches fresh protocol discovery.
37. Add focused `scripts/mcpb.test.mjs` fixtures for missing bundle/icon, stale version, bad root args, bad platform/runtime, extra files, missing/extra tool and normalized-archive comparison.
38. Add `mcpb:build` and `mcpb:check` root scripts.
39. Integrate `mcpb:check` into CORE-031’s single `VERIFY_STEPS` in the appropriate packaging/sync position; do not create a separate verification pyramid.
40. Refactor `check-plugin-sync.mjs` only as much as needed to share the fresh-standalone hash/distributed-copy assertion; preserve existing plugin behavior/messages.

### 4. Defend headless operation

41. Add `packages/mcp-server/src/smoke-headless.mjs` (or a script under `scripts/` if that is the existing convention).
42. Build/copy the standalone CJS into a temporary directory outside the repository with no parent `node_modules` reachable.
43. Create a disposable repository/board-root fixture with format-3 board data and governing source root where required.
44. Launch with plain Node 20 and explicit `--root <board-root>`; do not set Electron variables or start the GUI.
45. Perform raw MCP initialize and `tools/list`; assert the canonical tool roster/count from the same helper used by build/check.
46. Call `get_status` and assert:
   - exists/file board source;
   - explicit root provenance;
   - correct project/repo roots;
   - standalone build identity;
   - no GUI dependency.
47. Read a real fixture ticket/document and perform one controlled create/update/document write with expected revision/version where supported.
48. Assert the expected files changed and no files appeared outside the selected board/repo fixture.
49. Subscribe/unsubscribe to a resource where supported to exercise the lazy watcher fallback without requiring `fsevents`.
50. Close the client/server, ensure no process/watch handle remains and delete the fixture.
51. Add the smoke to `npm run verify` through the shared steps.

### 5. Integrate the release asset safely

52. Sequence/rebase the release integration after GUI-092 and GUI-093 so the release script has one canonical pack and resilient publish/repair behavior.
53. In `release.mjs`, build the MCPB once after version bump/build verification and before publishing; do not invoke a second fresh package build after generating expected hashes.
54. Require archive name/version to match the release version.
55. Include the archive in the same GitHub release publication/repair path without deleting existing release assets.
56. Update the printed release checklist/summary with MCPB path and manual Claude Desktop verification reminder.
57. Extend `verify-release-assets.mjs` to derive the versioned MCPB from `dist/mcpb/`, require its presence and compare public size/SHA-256.
58. Keep `latest.yml` installer-only semantics; MCPB has no updater manifest entry.
59. Extend verifier tests/golden fixtures for missing, wrong-size, wrong-digest and correct MCPB, plus expected-set sanity that cannot silently omit it.
60. Ensure CORE-036’s tag workflow reaches this check through the existing asset verifier; add no publishing permissions/action.
61. Keep old public-release assets untouched and preserve GUI-093’s single repair limit/refusal behavior.

### 6. Document supported behavior and limits

62. Amend FRD-022 with a “Headless and MCPB” section:
   - same file-backed tool/gate semantics;
   - GUI not required after board worktree exists;
   - explicit one-board root;
   - no GUI-created worktree or periodic Git sync;
   - no hidden network transport;
   - isolated Node 20 proof.
63. Amend FRD-012 install matrix:
   - Claude Desktop MCPB = local stdio Node runtime;
   - user selects board root containing `.kanmer`;
   - tools/prompts available;
   - Kanmer skill tree not installed;
   - separate from Claude Code plugin/GUI Connect/remote HTTP.
64. Correct ADR-0012’s stale statement that MCPB merely gains a better error: explicit `--root` intentionally bypasses discovery and selects the board folder.
65. Add/update the manual’s Claude Desktop MCPB install section:
   - prerequisites and package acquisition/hash;
   - local install flow using current supported Claude Desktop UI;
   - exact folder-picker guidance;
   - GUI-closed test;
   - restart/persistence;
   - one-board/no-skills/no-auto-sync limits;
   - wrong-root/no-board/runtime troubleshooting;
   - uninstall.
66. Update AGENTS.md package/release command table and contributor notes with `mcpb:build/check` and the real-host manual proof boundary.
67. Regenerate/check manual; do not hand-edit generated manual output or doc structure.

### 7. Perform real Claude Desktop acceptance

68. Use a named human/operator/verifier and record Windows/Claude Desktop versions.
69. Build the exact release-candidate MCPB from a clean verified commit and record archive/server/icon/manifest SHA-256.
70. Select a disposable or snapshotted real board worktree containing `.kanmer`; record source repo and pre-test Git/file state.
71. Close the Kanmer GUI and confirm no Kanmer GUI process is running.
72. Install the MCPB through Claude Desktop’s supported local extension flow and choose the exact board root.
73. Start a fresh Claude Desktop session and call `get_status`; assert selected board/source/server identity.
74. Read one existing ticket/document.
75. Perform one controlled reversible write through a normal Kanmer tool, using expected project/revision where supported.
76. Assert the selected board file changed and no other project/board changed.
77. Restart Claude Desktop without opening Kanmer and repeat `get_status`/read.
78. Confirm tools/prompts work and document that Kanmer skills are not installed by MCPB.
79. Confirm board changes remain uncommitted/unsynced until the operator handles Git or opens the GUI; do not call that a server failure.
80. Uninstall the extension, restart Claude Desktop and prove Kanmer no longer appears/launches through that MCPB.
81. Revert/remove the controlled board write and restore the pre-test board/Git state.
82. Record raw tool results, screenshots only as supplementary evidence, extension state and cleanup.

## Expected files

Add:
- `mcpb/manifest.json`
- `scripts/build-mcpb.mjs`
- `scripts/check-mcpb-sync.mjs`
- `scripts/mcpb.test.mjs`
- `packages/mcp-server/src/smoke-headless.mjs`
- a manual source chapter/section only if no current chapter is suitable

Modify:
- `package.json`
- `package-lock.json`
- `.gitignore`
- shared/plugin bundle sync checker as narrowly required
- `scripts/release.mjs`
- `scripts/verify-release-assets.mjs`
- `scripts/verify-release-assets.test.mjs`
- CORE-031 verify-step owner after it lands
- FRD-022, FRD-012, ADR-0012, AGENTS.md and manual index/generated output

Reuse without modifying:
- root `icon.png`
- standalone tsup configuration/server behavior
- MCP-025 HTTP transport

## Do not modify

- Server tool semantics, root-resolution order, GUI worktree creation/autosync, remote HTTP/auth/tunnels, multi-board support, non-Windows claims, plugin skills installation, signing/directory submission or another release publisher.
- Reintroduce MCP-005 relocation or stale plugin manifest forms.
- Begin GUI-075.

## Acceptance checks

- MCPB build is reproducible under `npm ci` using one pinned local tool.
- Package contains only current manifest, standalone server and canonical icon.
- Manifest version/tool/prompt metadata is derived from current source/protocol, not stale hand lists.
- Required picker/root/runtime/platform/one-board semantics are exact.
- Content sync checker catches payload/icon/version/tool/root/platform drift.
- Isolated plain-Node headless smoke performs real read/write with no GUI/modules.
- Release publisher builds/uploads once and external verifier requires/hashes MCPB.
- FRDs/ADR/manual/AGENTS accurately state one-board, no skills, no auto-sync/worktree creation and local stdio nature.
- Real Claude Desktop works with GUI closed, persists across restart, writes only selected board and uninstalls cleanly.

## Verification commands

```bash
npm ci
npm run build
npm run mcpb:build
npm run mcpb:check
node packages/mcp-server/src/smoke-headless.mjs
npm run test:scripts
npm test
npm run typecheck
npm run check:manual
npm run plugin:check
npm run verify
git diff --check
git status --short
```

Release/real-host proof:

```text
release candidate → one versioned MCPB → published asset verifier green
Claude Desktop install → select board root → get_status/read/write → restart → get_status → uninstall → absence/cleanup
```

## Failure and deviation rules

- If the pinned MCPB schema/tool differs from earlier research, capture the actual validator output and update source/tests before packaging; do not invent fields.
- If Claude Desktop’s runtime cannot run Node 20/server, mark FAIL/INCONCLUSIVE and do not broaden platform/runtime claims or fall back to Electron.
- If a user selects a repository root without `.kanmer`, fail with exact board-root guidance; do not silently scan despite explicit `--root`.
- If packer archives are nondeterministic, compare normalized contents; do not weaken payload/manifest checks.
- If release integration conflicts with GUI-092/093, rebase on their one-pack contract and keep one publisher/repair path.
- If manual Claude Desktop acceptance cannot be executed, leave the ticket incomplete; deterministic package validation is not a substitute.
- Do not merge or start GUI-075.

## Stop condition

Stop when the reproducible MCPB build/check, isolated headless smoke, release-asset integration and governing/manual docs are complete; a named verifier has installed the exact package in real Claude Desktop and proven GUI-closed read/write/restart/uninstall against one selected board; cleanup is recorded; all deterministic rails pass; and the PR is ready for independent review. Do not merge or begin another ticket.
