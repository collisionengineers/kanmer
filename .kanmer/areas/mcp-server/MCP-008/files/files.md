# Files — MCP-008

Surface area of "run the board headless, and ship a `.mcpb` for Claude Desktop".

Two headline facts from `research/` shape this table and should be read first:

1. **The MCP server needs no Electron and no `node_modules`** — proven by running
   the standalone bundle in an isolated directory under plain Node (120/120
   smoke checks). So the headless half is almost entirely *documentation and
   tests*, not server code.
2. **The `.mcpb` half is packaging** — `--root` already exists and
   `user_config.type: "directory"` already supplies it. No `packages/mcp-server`
   change is required to accept a user-picked board.

## Where the change lands

| Path | What changes | Risk |
|---|---|---|
| `docs/functional/frd/FRD-022-mcp-server-surface.md` | Add a **supported-modes** section: headless (no GUI) is supported; what an agent may rely on (all reads/writes/gates, plain fs); what it may not (no git auto-sync while the app is closed — FRD-020 R3 is GUI-owned; the worktree must already exist). Add the `.mcpb` install path to the surface. | **Low.** Doc-only. Risk is writing limits we have not actually tested — mitigate by citing the isolated-Node run and the unsynced-board test. |
| `docs/functional/frd/FRD-012-connect.md` | Add `.mcpb` to the install matrix alongside Connect and the plugin marketplace, stating its runtime assumption (Claude Desktop's bundled Node) and how the board is selected (`user_config` directory). MCP-011 also edits this matrix — **coordinate**. | **Medium — collision.** MCP-011 explicitly commits to stating the runtime dependency "in FRD-012's install matrix". Same section, two tickets. |
| `scripts/build-mcpb.mjs` *(new)* | Assemble a staging dir (`manifest.json`, `server/kanmer-mcp.cjs`, `icon.png`), then `mcpb pack`. Direct sibling of the existing `scripts/build-plugin.mjs`. | **Medium.** New external tool dependency (`@anthropic-ai/mcpb`). Must fail loudly if the standalone bundle is missing, exactly as `build-plugin.mjs` does. |
| `mcpb/manifest.json` *(new, location TBD)* | The bundle manifest: `manifest_version`, name/version/description/author, `server` (`type: "node"`, `entry_point`, `mcp_config` with `--root ${user_config.board_root}`), `user_config.board_root` (`type: "directory"`, `required`), `compatibility` (platforms, `runtimes.node`), `tools`, icon. | **Medium.** `version` must track the repo version or it silently drifts — the exact failure MCP-011 documents for `plugin.json` (`0.1.0` vs repo `0.3.2`). Needs a rail. |
| `package.json` (root) | New scripts: `mcpb:build` (and probably `mcpb:check`), mirroring `plugin:build` / `plugin:check`. | **Low.** Additive. |
| `scripts/check-plugin-sync.mjs` *or a new `check-mcpb-sync.mjs`* | Extend the staleness rail so the `.mcpb`'s payload byte-matches a fresh build and its manifest version matches the repo version. | **Medium.** The existing script already asserts bundle bytes for the plugin copy; a second consumer of the same bundle should reuse that logic rather than fork it. |
| `scripts/release.mjs` | Attach the `.mcpb` as a release asset (and say so in the checklist it prints, currently step 7 at `:174`). | **HIGH.** This script has hard-won constraints in comments at `:210-257`: tag before publish; **never delete assets from old releases** (`Provider.getBlockMapFiles` derives URLs); re-uploading to a >2h-old release needs special handling. Touch it carefully or add the asset out-of-band. |
| `apps/gui/build/icon.png` *(new)* | A 512×512 PNG. Only `icon.ico` exists today. | **Low.** Cosmetic, but `mcpb pack` wants a PNG. |
| `packages/mcp-server/src/index.ts` | **Probably untouched.** Only in scope if the plan chooses to emit a clearer "no board at `<path>`" diagnostic for the desktop case — and MCP-010 already owns that error message. | **Low, and prefer zero.** Any change here re-triggers the byte-comparison rail and forces a plugin rebuild. |
| `packages/mcp-server/src/smoke.mjs` | Optionally add a headless assertion: run the bundle from a directory with no reachable `node_modules`. This is the test that turns the research finding into a defended one. | **Low.** Additive checks; the count assertion at the top (`29 tools`) is unaffected. |
| `AGENTS.md` | §11 and the packaging notes describe how the server is launched; a second supported install path belongs there. | **Low — but check MCP-005 first**, which also rewrites this area. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `apps/gui/src/main/connect.ts:36-52` (`serverInvocation`) | Why `process.execPath` + `ELECTRON_RUN_AS_NODE=1` was chosen — "so the target machine needs no separate Node". Read this before assuming the Electron binary is load-bearing: it is a *runtime supply* decision, not an API dependency. |
| `packages/mcp-server/tsup.standalone.config.ts` | `noExternal: [/.*/]`, `platform: "node"`, `target: "node20"` — the payload is already one self-contained CJS file. Its comment explains why CJS and not ESM (gray-matter's dynamic require). |
| `packages/mcp-server/src/root.ts:12-42` | The exact resolution order `--root` → `KANMER_ROOT` → `cwd`, and that `readFlag` handles both `--root X` and `--root=X` and absolutises. This is the interface the `.mcpb` manifest talks to. |
| `packages/core/src/paths.ts:20-37` (`deriveRepoRoot`) | Why a **single** directory picker is enough: `<repo>/.worktrees/<name>` is mapped back to `<repo>` automatically, so governing-doc `refs` resolve without a second `--repo-root` picker. |
| `packages/mcp-server/src/index.ts:1007-1030` | The chokidar watcher is **lazy** — started only on `resources/subscribe`. This is why the optional `fsevents` dep is a bounded macOS risk rather than a startup blocker. |
| `scripts/build-plugin.mjs` | The precedent to copy: verify the standalone bundle exists, fail with the exact remediation command, copy, report size. 17 lines. A `.mcpb` target should look like this. |
| `scripts/check-plugin-sync.mjs:1-70` | Why byte-comparison exists at all: the committed bundle "carries independent compiled copies of every store method, so behaviour can drift arbitrarily far from source without a single tool name changing." A second distributed copy inherits this problem. |
| `scripts/release.mjs:200-260` | The release constraints that make adding an asset non-trivial: tag-before-publish, never delete old assets, the 2-hour re-upload rule. |
| `apps/gui/electron-builder.yml` | `extraResources` shows how the payload reaches `process.resourcesPath/mcp/kanmer-mcp.cjs` today, and `win: target: nsis` shows Kanmer is Windows-only — which is the input to the `.mcpb` `platforms` decision. |
| `docs/functional/frd/FRD-020-board-git-worktree-sync.md` R3 | Exactly what auto-sync does and that it runs on a GUI timer — the source of the "unsynced board" limit FRD-022 must state. |
| `plugins/kanmer/mcp/claude.mcp.json` + `plugins/kanmer/.mcp.json` | The two existing registrations, both `"command": "node"` with no `--root`. MCP-011 owns fixing them; read them so the `.mcpb` manifest is not written to be a third inconsistent answer. |
| MCP-005 research/plan (when written) | **Read before writing the build script.** It decides the payload's identity and location; the `.mcpb` target must source from it rather than hardcode `dist/standalone/kanmer-mcp.cjs`. |

## Ripple effects

- **The staleness rail multiplies.** `kanmer-mcp.cjs` currently has two homes
  (`dist/standalone/`, `plugins/kanmer/mcp/`) and `check-plugin-sync.mjs` guards
  the second. A `.mcpb` makes three. Whatever MCP-005 does makes four. The rail
  should become "every distributed copy matches a fresh build", once, rather
  than a per-copy script.
- **Version drift is a *known* failure here, not a hypothetical.** MCP-011
  documents `plugin.json` stuck at `0.1.0` against a repo at `0.3.2`, which
  silently killed the "Update skills" affordance. A `.mcpb` manifest carries its
  own `version` and will do the same unless a check asserts it.
- **`npm run build` becomes a prerequisite for one more command**, matching the
  existing `plugin:build` / `plugin:check` pairing documented in AGENTS.md §10.
- **Release process gains a step and a manual verification** — the ticket's own
  acceptance ("a `.mcpb` installs into Claude Desktop and connects to a chosen
  project root") is a human test on a real Claude Desktop; it cannot be
  automated in this repo, which has no CI at all.
- **A new external toolchain dependency**, `@anthropic-ai/mcpb`, installed
  globally per the docs. Decide whether it becomes a devDependency (reproducible)
  or a documented prerequisite (lighter). Contributor docs follow either way.
- **Docs (`docs/manual/`)** — an install path a user can take needs a manual
  entry; `scripts/build-manual.mjs` has a `--check` mode that may notice.
- **MCP-011 collision** on `FRD-012`'s install matrix, and on the question "what
  runtime does each install path assume". The `.mcpb` answer (Claude Desktop's
  bundled Node) is a *third* answer next to Connect's Electron-as-Node and the
  plugin manifests' Node-on-PATH. All three should be stated in one table.
- **MCP-010 changes the manifest's help text, not its shape.** If discovery lands
  first, `board_root`'s `description` says "your project folder"; if not, it must
  say "the folder containing `.kanmer`, usually `<repo>/.worktrees/kanmer`".

## Out of scope

- **A headless git committer / auto-sync daemon.** Ruled out by the ticket's own
  "What is *not* a blocker" section. Headless means *works once set up*; the
  unsynced board is a documented limit, not a bug to fix here.
- **Board worktree creation without the GUI.** `ensureBoardWorktree` stays
  GUI-owned; the worktree existing is a precondition.
- **Deciding where the desktop app's own server payload lives.** That is MCP-005
  and this ticket must not pre-empt it.
- **Board discovery when `--root` is absent.** That is MCP-010. The `.mcpb`
  always passes an explicit `--root` and would continue to even after MCP-010.
- **Fixing the two plugin manifests.** That is MCP-011.
- **Multi-board support in one server process.** Real, but a server design change
  (`--root` takes one value); see open questions.
- **Directory / Connectors submission.** The Anthropic guide notes MCPB is the
  *secondary* distribution path and directory submission carries extra
  requirements (mandatory tool annotations, privacy policy, working examples).
  Out of scope: this ticket ships a bundle for direct install.
- **macOS/Linux support generally.** Kanmer ships Windows NSIS only. The `.mcpb`
  `platforms` field must be set honestly rather than aspirationally.
- **Signing the bundle** (`mcpb sign`). Noted as available; not required for
  direct install.
