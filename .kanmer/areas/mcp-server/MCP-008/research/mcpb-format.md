# Research — half 2: the `.mcpb` bundle format

Researched against current official documentation, 2026-08-16.

## Sources

| What | URL |
|---|---|
| Anthropic guide: "Build a desktop extension with MCPB" | https://claude.com/docs/connectors/building/mcpb |
| MCPB repository (spec + tools) | https://github.com/modelcontextprotocol/mcpb |
| **Manifest spec (authoritative schema)** | https://github.com/modelcontextprotocol/mcpb/blob/main/MANIFEST.md |
| CLI reference | https://github.com/modelcontextprotocol/mcpb/blob/main/CLI.md |
| Examples | https://github.com/modelcontextprotocol/mcpb/tree/main/examples |
| MCP blog: adopting `.mcpb` for portable local servers (2025-11-20) | https://blog.modelcontextprotocol.io/posts/2025-11-20-adopting-mcpb/ |
| Anthropic engineering: Desktop Extensions | https://www.anthropic.com/engineering/desktop-extensions |
| End-user install / admin controls | https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop |

Note the format was renamed: it was `.dxt` ("Desktop Extensions") and is now
`.mcpb` ("MCP Bundle"), moved under the `modelcontextprotocol` org. Any older
material referring to `.dxt` / `@anthropic-ai/dxt` describes the same thing under
its previous name. The repo has **no existing `.mcpb`/`.dxt`/bundle artefact** —
a grep for those strings hits only a passing "Claude Desktop" in README.md.

## F5 — What a `.mcpb` is

A **ZIP archive** with an `.mcpb` extension, containing a local stdio MCP server
plus a `manifest.json`. Only `manifest.json` is mandatory. Claude Desktop reads
the manifest, unpacks the server into a per-user extensions directory, and
launches it over stdio. Runs locally, works offline, no OAuth.

Typical Node layout per the repo README:

```
bundle.mcpb (ZIP)
├── manifest.json
├── server/index.js
├── node_modules/
├── package.json (optional)
└── icon.png (optional)
```

## F6 — How the server binary is carried, and the runtime

`server.type` is one of `node` | `python` | `uv` | `binary`. **Node is strongly
recommended, for a reason that matters to us:**

> "Node.js ships with Claude for macOS and Windows, which means your bundle will
> work out-of-the-box for users without requiring them to install additional
> runtimes." — MCPB README

That is the same problem `ELECTRON_RUN_AS_NODE` solves for Connect, solved by the
host instead. **A `.mcpb` needs neither Electron nor a system Node.** For Node
bundles the guidance is `npm install --production` and ship `node_modules/`; we
do not need that at all, because we already emit a fully-linked single CJS file.

The `server` block:

```json
{
  "server": {
    "type": "node",
    "entry_point": "server/index.js",
    "mcp_config": {
      "command": "node",
      "args": ["${__dirname}/server/index.js"],
      "env": { "VAR": "value" },
      "platform_overrides": {
        "win32": { "command": "...", "args": ["..."] },
        "darwin": { "env": { } }
      }
    }
  }
}
```

Variable substitution available in `mcp_config`:

| Variable | Resolves to |
|---|---|
| `${__dirname}` | the installed extension's directory (absolute) |
| `${HOME}` | user home |
| `${DESKTOP}` / `${DOCUMENTS}` / `${DOWNLOADS}` | user folders |
| `${pathSeparator}` / `${/}` | platform separator |
| `${user_config.KEY}` | a user-supplied config value |

Manifest top level: required `manifest_version` (currently `"0.3"`), `name`,
`version`, `description`, `author.name`, `server`. Optional: `display_name`,
`long_description`, `icon`/`icons`, `repository`, `homepage`, `documentation`,
`support`, `screenshots`, `tools`, `tools_generated`, `prompts`,
`prompts_generated`, `keywords`, `license`, `privacy_policies`, `compatibility`,
`user_config`, `localization`, `_meta`.

`compatibility` pins the host and platforms:

```json
{
  "compatibility": {
    "claude_desktop": ">=1.0.0",
    "platforms": ["darwin", "win32", "linux"],
    "runtimes": { "node": ">=16.0.0" }
  }
}
```

Claude Desktop itself runs on `darwin` and `win32` only. Kanmer ships Windows
NSIS only today (`apps/gui/electron-builder.yml` → `win: target: nsis`), so
`platforms` is a real decision, not a formality — see open questions.

Icon: `icon.png` in the bundle root, 512×512 recommended (256×256 minimum), PNG
with transparency. Kanmer has only `apps/gui/build/icon.ico` — a PNG must be
produced or sourced.

## F7 — **The board-selection answer: `user_config` with `type: "directory"`**

This is the crux the ticket names, and the format supports it directly. A
`user_config` block makes Claude Desktop **generate a settings UI automatically**
at install time — the user fills it in during the install dialog. Each entry:

```json
{
  "user_config": {
    "config_key": {
      "type": "string|number|boolean|directory|file",
      "title": "Display Name",
      "description": "Help text",
      "required": true,
      "default": "value or ${VARIABLE}",
      "sensitive": false,
      "multiple": false,
      "min": 1,
      "max": 100
    }
  }
}
```

`type: "directory"` renders a **native folder picker**. The spec's own example:

```json
"allowed_directories": {
  "type": "directory",
  "title": "Allowed Directories",
  "description": "Directories the server can access",
  "multiple": true,
  "required": true,
  "default": ["${HOME}/Desktop"]
}
```

The chosen value is interpolated into `mcp_config` via `${user_config.KEY}`. So
the shape Kanmer needs is, in essence:

```json
{
  "server": {
    "type": "node",
    "entry_point": "server/kanmer-mcp.cjs",
    "mcp_config": {
      "command": "node",
      "args": [
        "${__dirname}/server/kanmer-mcp.cjs",
        "--root", "${user_config.board_root}"
      ]
    }
  },
  "user_config": {
    "board_root": {
      "type": "directory",
      "title": "Kanmer board",
      "description": "The folder containing .kanmer — usually <your repo>/.worktrees/kanmer",
      "required": true,
      "multiple": false
    }
  }
}
```

**No server change is needed to accept it.** `--root` already exists and is first
in the resolution order (`packages/mcp-server/src/root.ts:12-17`), and
`readFlag` resolves it to an absolute path. The `.mcpb` half is a *packaging*
job, not a server job.

Two consequences worth writing down:

- **`--repo-root` is not needed for the normal layout.** `deriveRepoRoot`
  (`packages/core/src/paths.ts:32-37`) recognises `<repo>/.worktrees/<name>` and
  maps it back to `<repo>` on its own, so governing-doc `refs` resolve correctly
  from a picked board root without a second picker. It is only needed for layouts
  Kanmer does not itself create. An *optional*, non-required second `directory`
  entry would cover those without burdening the common case.
- **One extension = one board.** `multiple: true` on a directory expands into
  several separate `args` entries, which `--root` cannot consume — it takes one
  value. A user with several projects therefore gets one board per installed
  extension, and Claude Desktop installs one instance per extension. Whether that
  is acceptable, or whether the server should learn multi-root, is an open
  question — **not** something to solve by abusing `multiple`.

## F8 — Which folder does the user actually pick? (where MCP-010 helps)

Today `--root` must be the folder that *contains* `.kanmer`. For a board created
by the desktop app that is `<repo>/.worktrees/kanmer` — a hidden-ish path a user
would not naturally choose in a folder dialog, and one that does not exist until
the app has been run once. Picking `<repo>` today yields "no board".

With MCP-010's discovery landed, `<repo>` becomes a valid answer: the resolver
would find `<repo>/.worktrees/*/.kanmer`. That is a materially better picker
experience and worth stating as the reason MCP-010 is *related* rather than
irrelevant — **but it changes only which folder is acceptable, not the need to
ask.** MCP-010 is rooted at cwd; the `.mcpb` still has to supply an explicit
`--root` from `user_config`, because a desktop app's cwd is meaningless. Both
tickets are needed and neither substitutes for the other.

(A subtlety for planning: if MCP-010 lands, an `.mcpb` could in principle pass
`--root` pointing at the *repo* and let discovery do the rest. If MCP-010 does
not land first, the manifest's `description` text must tell the user to pick
`.worktrees/kanmer` explicitly. Either way the manifest works — only the help
string and the tolerated input differ.)

## F9 — Build and distribution mechanics

CLI is `npm install -g @anthropic-ai/mcpb`, commands:

| Command | Purpose |
|---|---|
| `mcpb init [directory]` | interactively scaffold `manifest.json` |
| `mcpb validate <path>` | check the manifest against the schema |
| `mcpb pack <directory> [output]` | zip → `.mcpb`; validates the manifest, max compression, auto-excludes `.git/`, `node_modules/.cache/`, `.env.local`, lockfiles; extra exclusions via `.mcpbignore` |
| `mcpb sign [--cert --key --intermediate --self-signed] <file>` | PKCS#7 / X.509 signature appended to the zip |
| `mcpb verify <file>` / `mcpb unsign <file>` / `mcpb info <file>` | signature + metadata inspection |

Install paths for the user: double-click the `.mcpb`, drag-drop onto the Claude
Desktop window, or Settings → Extensions → Advanced settings → Install
Extension…. All three open an install UI that renders the `user_config` form.
Installation is per-user.

**Where it would slot into this repo.** There is no CI (`.github/` does not
exist); `scripts/release.mjs` drives electron-builder's GitHub publish and then
verifies `latest.yml` is fetchable. The closest existing precedent for a new
build target is `scripts/build-plugin.mjs`, which copies
`packages/mcp-server/dist/standalone/kanmer-mcp.cjs` into
`plugins/kanmer/mcp/`, paired with `scripts/check-plugin-sync.mjs`, which
**byte-compares** the committed copy against a fresh build so behaviour cannot
drift. An `.mcpb` target is the same move with a manifest and a `mcpb pack` on
the end, and would want the same staleness rail.

## Relationship to MCP-005 (blocking) — the `.mcpb` half is largely insulated

An `.mcpb` **carries its own copy of the server payload inside the bundle**, and
Claude Desktop unpacks it into its own per-user extensions directory. That
directory is not `%LOCALAPPDATA%\Programs\Kanmer`, so a `.mcpb`-installed server
is already outside the install directory by construction — it does not consume
whatever location MCP-005 chooses, and a Kanmer update does not replace it.

- **Assumed:** MCP-005 keeps producing a single self-contained payload built from
  `packages/mcp-server` that a build script can copy, exactly as
  `build-plugin.mjs` copies one today. The `.mcpb` build target should source its
  payload from whatever MCP-005 settles on, not hardcode
  `dist/standalone/kanmer-mcp.cjs` if MCP-005 moves or renames it.
- **NOT assumed / must not be pre-empted:** where the *desktop app's* registered
  server lives, whether it is a sidecar binary, a shim, or a bundled runtime, and
  whether registrations get migrated. If MCP-005 lands a scheme where the payload
  is a native binary rather than a `.cjs`, the manifest would use
  `server.type: "binary"` instead of `"node"` — a small manifest change, and one
  more reason to write the `.mcpb` target *after* MCP-005 decides rather than
  guessing.
- **Independent evidence for MCP-005's constraint:** Claude Desktop ships its own
  Node (F6), so the `.mcpb` path satisfies "no Node install required" without any
  Electron trick at all. Offered as data, not as a recommendation for MCP-005.
