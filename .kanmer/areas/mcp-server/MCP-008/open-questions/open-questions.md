# Open questions — MCP-008

The 2026-08-20 MASTERPLAN reconciliation, completed MCP-010 discovery work and current release-rail decisions resolve every implementation-shaping question from the earlier research.

- [x] **Does MCPB wait for or depend on MCP-005?** — No. MCP-005 is archived and its relocation premise was refuted. Build from the existing fresh standalone CJS output.
- [x] **Which platforms are claimed?** — `win32` only in v1. The payload may later prove portable, but macOS watcher/runtime behavior has not been executed.
- [x] **How many boards does one installed extension serve?** — One required `board_root`. Multi-board/multi-root is deferred to a separate observed-demand ticket.
- [x] **Does MCPB become a release asset?** — Yes. The existing `release.mjs` publisher builds/includes it once after GUI-092/093; `verify-release-assets.mjs` and CORE-036’s tag workflow require/hash-check it. No separate manual publisher is authoritative.
- [x] **How is the MCPB build tool supplied?** — Pinned root devDependency, installed by `npm ci` and invoked locally. No global prerequisite.
- [x] **Who performs the real Claude Desktop acceptance?** — A named human/operator or verifier with a real supported Claude Desktop installation. The plan supplies exact steps/evidence; the implementing code agent stops until the manual proof is recorded.
- [x] **Does this wait for MCP-010?** — MCP-010 is Done. MCPB nevertheless passes explicit `--root`, so the chosen directory must directly contain `.kanmer`; discovery does not reinterpret an asserted repository root.
- [x] **Where do source and generated files live?** — Source/template in committed `mcpb/`; generated staging/archive under `dist/mcpb/`; versioned archive `kanmer-<version>.mcpb`.
- [x] **Does MCPB ship the Kanmer skills?** — No. It exposes MCP tools and registered prompts only. Full workflow skills remain a Claude Code/plugin-host path; docs state the difference.
- [x] **What is promised about GUI-closed Git sync?** — File-backed board operations work headlessly, but GUI-owned periodic Git auto-sync/worktree creation do not. The operator remains responsible for committing/pushing board changes or reopening the GUI. No headless committer/status feature is added.
- [x] **What directory does the picker request?** — The board root containing `.kanmer`, normally `<repo>/.worktrees/kanmer`. The label/help and preflight/error must make this explicit.
- [x] **What runtime is declared?** — Node 20, matching the standalone bundle target; real Claude Desktop proof confirms the host supplies it.
- [x] **How is tool metadata kept current?** — Generate/verify it from a real `tools/list` call against the freshly built standalone server. No manually copied roster.
- [x] **How is bundle drift checked?** — Rebuild to temp, unpack/normalize and compare manifest plus server/icon bytes. Do not require archive byte equality when packer timestamps are nondeterministic.
- [x] **Which icon is used?** — Copy the existing canonical root `icon.png` (1254×1254 RGBA) into staging; no new design asset.
- [x] **How does this relate to Streamable HTTP?** — It does not depend on it. MCPB is a local stdio distribution path; MCP-025 is the one remote transport.

## Parked (explicitly deferred)

- [ ] MCPB signing and Anthropic/connector directory submission — direct local installation does not require them; reopen for broad public distribution/compliance.
- [ ] macOS support — reopen after an actual macOS Claude Desktop runtime/watcher/tool-call run.
- [ ] Multi-board configuration in one extension/server — reopen only after measured user demand.
- [ ] Installing Kanmer agent skills into Claude Desktop — MCPB format/tool path does not currently establish this; separate host capability research required.
