# AGENTS.md — Contributor & AI-agent guide to Kanmer

This file is the single source of truth for **how to work on Kanmer**. It's written for an AI coding agent (codex, Claude Code, etc.) or a new human contributor who needs to be productive without reading every file first. `CLAUDE.md` points here.

For end-user install/usage, see [README.md](README.md). This file is about *building the thing*.

---

## 1. What Kanmer is (the one idea)

A Kanban / ticket / plan / research manager where **AI agents and a human drive one shared dataset**.

The load-bearing decision: **the filesystem is the single source of truth.** Each project holds a `.kanmer/` folder of Markdown-with-frontmatter files. Two independent processes read/write those files:

- the **MCP server** — the agent surface (codex, Claude, any MCP client), over stdio;
- the **Electron GUI** — the human surface.

They never talk to each other directly. They synchronise *through the files*, and the GUI live-reloads via a filesystem watcher. An agent-created ticket appears on the board within a fraction of a second; a GUI edit is visible to the agent's next `get_item`.

```
codex / Claude / any MCP client ──stdio──► kanmer-mcp ─┐
                                                        ├─► .kanmer/  (Markdown + frontmatter = source of truth)
              You ──► Kanmer GUI (Electron) ────────────┘        ▲
                          └── chokidar watches .kanmer/ ─────────┘  (live reload on external change)
```

Everything else in the codebase follows from that model.

---

## 2. Repository layout

npm-workspaces monorepo. Build order is core → mcp-server → gui (each depends on the previous).

```
kanmer/
  package.json            # workspaces root; the top-level scripts you'll use
  tsconfig.base.json      # shared strict TS config all packages extend
  README.md               # end-user install/usage
  AGENTS.md               # THIS FILE
  examples/
    codex-config.toml     # manual codex MCP registration example

  packages/
    core/                 # @kanmer/core — the shared store. THE HEART.
      src/
        types.ts          # zod schemas + TS types (BoardConfig, Item, filters…)
        paths.ts          # .kanmer path resolution + per-type subfolders
        io.ts             # atomic writes (temp + rename), fs helpers
        frontmatter.ts    # parse/serialise Markdown+frontmatter (gray-matter)
        ids.ts            # sequential id allocation (TICK-001…) + disk reconcile
        board.ts          # read/write board.yml + defaultBoardConfig()
        store.ts          # KanmerStore: CRUD, move, search, addColumn
        links.ts          # forward links + backlinks, [[wiki]] parsing, linkItems
        watch.ts          # chokidar wrapper (debounced) the GUI subscribes to
        index.ts          # barrel — the package's public API
        *.test.ts         # vitest suites (frontmatter, store, links)
      tsup.config.ts      # ESM build → dist/

    mcp-server/           # @kanmer/mcp-server — local stdio MCP server
      src/
        index.ts          # McpServer + 11 tools + stdio transport
        root.ts           # resolve project root: --root → KANMER_ROOT → cwd
        smoke.mjs         # standalone stdio smoke test (spawns the server)
      tsup.config.ts            # ESM dev build (deps external) → dist/index.js
      tsup.standalone.config.ts # self-contained CJS bundle → dist/standalone/kanmer-mcp.cjs

  plugins/
    kanmer/               # Cross-agent plugin (Claude Code + codex)
      .claude-plugin/plugin.json   # Claude manifest → mcp/claude.mcp.json
      .codex-plugin/plugin.json    # codex manifest  → ../.mcp.json
      .mcp.json           # codex companion ({"mcpServers":…} + ${PLUGIN_ROOT}) — must live at plugin root
      mcp/
        claude.mcp.json   # {"mcpServers":…} + ${CLAUDE_PLUGIN_ROOT}
        kanmer-mcp.cjs    # committed build artifact (npm run plugin:build)
      skills/
        kanmer-workflow/  # SKILL.md + references/tool-reference.md + assets/*-template.md
        kanmer-standup/   # board status report
        kanmer-onboard/   # first-time project setup
  .claude-plugin/marketplace.json  # Claude marketplace entry (repo-hosted)
  .agents/plugins/marketplace.json # codex marketplace entry (repo-hosted)

  scripts/
    build-plugin.mjs      # copy standalone MCP bundle into plugins/kanmer/mcp/
    check-plugin-sync.mjs # fail if tool names drift from the skill's tool reference

  apps/
    gui/                  # @kanmer/gui — Electron + React desktop app
      electron.vite.config.ts   # electron-vite: bundles everything into out/
      electron-builder.yml      # Windows NSIS installer config
      src/
        main/
          index.ts        # Electron main: window, IPC handlers, watcher
          settings.ts     # user-global settings (theme, recent projects) in userData
          connect.ts      # one-click `codex/claude mcp add` registration
        preload/
          index.ts        # contextBridge → window.kanmer typed API
          index.d.ts      # global Window typing
        shared/
          ipc.ts          # IPC channel names + KanmerApi contract (main↔renderer)
        renderer/
          index.html
          src/
            main.tsx      # React root
            App.tsx       # top-level state, layout, filtering pipeline
            components/   # Board, Editor, ItemList, FilterBar, Settings, Welcome, QuickAdd
            lib/          # board.ts (column lookups), markdown.ts ([[wiki]] render)
            styles.css    # theme tokens (dark + [data-theme=light]) + all component CSS
```

---

## 3. Tech stack & why (the decisions)

| Choice | What | Why this and not the alternative |
|---|---|---|
| **All TypeScript** | core, server, GUI | The frontmatter/id/link logic is written **once** in `@kanmer/core` and reused by both the server and the Electron main process. This is the whole reason the GUI is Electron (below). |
| **File-based store** | `.kanmer/` Markdown+frontmatter | Makes agents and the human share one dataset with zero sync layer. Git-friendly, human-readable, no DB/daemon. |
| **Electron (not Tauri/.NET)** | desktop GUI | Electron main runs Node, so it imports `@kanmer/core` directly — no reimplementation. Tauri (Rust) or .NET (C#) would mean writing the store logic twice. Trade-off accepted: bigger binary. |
| **Official MCP TS SDK** (`@modelcontextprotocol/sdk`) | server | Best spec coverage; `McpServer.registerTool` with annotations. |
| **stdio transport** | server | Universal across codex + Claude + any MCP host; no ports/auth. codex/Claude spawn it as a child process. |
| **gray-matter + `yaml`** | frontmatter / board.yml | gray-matter round-trips item frontmatter; `yaml` handles `board.yml`. |
| **zod** | schemas | One validation definition shared by server tool inputs and the store. |
| **chokidar** | watcher | Reliable cross-platform FS events for GUI live-reload. |
| **electron-vite + electron-builder** | GUI build + installer | Vite DX for Electron; NSIS installer for Windows. |
| **Electron-as-Node** (`ELECTRON_RUN_AS_NODE=1`) | how the installed app runs the MCP server | The packaged app *is* the Node runtime, so end users need **no separate Node install**. |

---

## 4. Data model

### The `.kanmer/` folder (per project)

```
.kanmer/
  data/
    board.yml         # phases, statuses, areas, priorities, idPrefixes
    counters.json     # last-used numeric id per type
  tickets/  TICK-001.md …
  plans/    PLAN-001.md …
  research/ RES-001.md …
```

### `board.yml` — drives both tools and GUI columns

```yaml
statuses:   [{ id, name, color? }, …]   # THE workflow dimension = board columns
areas:      [{ id, name, color? }, …]   # colour-coded clusters within columns
priorities: [{ id, name, color? }, …]   # configurable (default: low/medium/high/urgent)
idPrefixes: { ticket: TICK, plan: PLAN, research: RES }
```

**One stage dimension, deliberately.** An earlier model had both `phases`
(swimlanes) and `statuses` (columns); they overlapped so heavily
("backlog"≈"todo", "build"≈"in progress") that the board was harder to read
than the work it described. `status` is now the only workflow axis, with six
default stages:

```
todo → planning → implementing → review → verifying → done
```

Legacy data loads without migration: a `phases:` array in an old `board.yml` is
stripped by zod on read, and a `phase:` key in an old item file rides along via
`passthrough()` while nothing reads it. Old projects keep their own `statuses`
list; unknown status values still render through the Board's `mergeColumns`
fallback.

### An item file (frontmatter is what the GUI edits; body is free Markdown)

```markdown
---
id: TICK-001
type: ticket           # ticket | plan | research
title: …
status: implementing   # the workflow stage = board column
area: api              # optional; clusters + colours the card
priority: high         # a string id into board.priorities
assignee: ""
labels: [mcp]
links: [PLAN-001]      # structured relations (tool-queryable)
archived: false        # hidden from the board unless "Show archived"
created: 2026-08-12T…Z
updated: 2026-08-12T…Z
---
Body Markdown. Reference other items with [[RES-001]] wiki-links.
```

**Linking is two mechanisms** resolved into one backlink graph: the `links:` frontmatter array *and* inline `[[ID]]` wiki-links in the body (see `links.ts`).

---

## 5. The three surfaces in detail

### `@kanmer/core` (packages/core)
The only place that touches `.kanmer` files. Public API via `index.ts`. Key entry point: **`KanmerStore`** (`store.ts`) — construct with a project root, call `init()`, then `listItems/getItem/createItem/updateItem/moveItem/deleteItem/searchItems/getBoard/setBoard/addColumn`. Links live in `links.ts` (`getLinkGraph`, `linkItems`, `parseWikiLinks`). Everything is covered by `*.test.ts` (vitest).

### `@kanmer/mcp-server` (packages/mcp-server)
`index.ts` builds an `McpServer` and registers **11 tools**, then connects a `StdioServerTransport`. Root resolution in `root.ts`. **Init is lazy**: boot never calls `store.init()` — a read-only session (or a host that spawns the server in a workspace nobody opted into Kanmer for) must not create `.kanmer/` just by connecting. Write tools call `ensureInit()` first, which creates the skeleton once on the first actual write; read tools degrade to empty/default results when `.kanmer/` doesn't exist yet. Two builds:
- `dist/index.js` — ESM, deps external (for dev / `node …`).
- `dist/standalone/kanmer-mcp.cjs` — self-contained CJS, everything bundled (shipped inside the GUI, run via Electron-as-Node).

**Tools** (all carry annotations so codex approval modes / Claude read-write split behave):
- Read (`readOnlyHint`): `list_board`, `list_items`, `get_item`, `search_items`, `get_links`
- Write: `create_item`, `update_item`, `move_item`, `link_items`, `add_column`
- Destructive (`destructiveHint`): `delete_item`

The plugin's `kanmer-workflow` skill documents this surface for agents — see the
sync rule in §7.

### `@kanmer/gui` (apps/gui)
Electron. **Main** (`main/index.ts`) imports `@kanmer/core` and owns *all* file access + the chokidar watcher; **renderer** (React) is pure UI and reaches main only through the typed `window.kanmer` bridge (`shared/ipc.ts` → `preload/index.ts`). `connect.ts` runs the agent `mcp add` CLI. `settings.ts` stores theme + recent projects in Electron `userData` (these are user-global, not per-project).

---

## 6. Commands

Run from the repo root unless noted.

| Command | Does |
|---|---|
| `npm run setup` | install + build core, server, and GUI |
| `npm run build` | build core + mcp-server (incl. standalone bundle) |
| `npm test` | core vitest suite |
| `npm run app` | build + launch the GUI |
| `npm run dev:gui` | GUI with hot reload |
| `npm run dist` | build everything **and** produce `apps/gui/release/Kanmer Setup <v>.exe` |
| `npm run plugin:build` | build, then copy the standalone MCP bundle into `plugins/kanmer/mcp/` |
| `npm run plugin:check` | fail if MCP tool names drift from the skill's tool reference |
| `node packages/mcp-server/src/smoke.mjs` | stdio smoke test against the built server |

**Smoke test env overrides** (in `smoke.mjs`): `KANMER_SERVER=<path>` points at a different server entry (e.g. the standalone bundle); `KANMER_NODE=<electron.exe>` runs it via Electron-as-Node (sets `ELECTRON_RUN_AS_NODE=1`). Example — test the packaged server exactly as shipped:
```bash
KANMER_NODE="apps/gui/release/win-unpacked/Kanmer.exe" \
KANMER_SERVER="apps/gui/release/win-unpacked/resources/mcp/kanmer-mcp.cjs" \
node packages/mcp-server/src/smoke.mjs
```

**GUI boot smoke** (exits after render): `KANMER_SMOKE=1 KANMER_OPEN=<projectDir> npx electron .` from `apps/gui`.

---

## 7. Conventions & guidelines

- **TypeScript strict everywhere** (`tsconfig.base.json`). No `any` escapes; run the package `typecheck` scripts.
- **ESM vs CJS is deliberate.** `@kanmer/core` and the ESM server build are ESM (`"type": "module"`). The **standalone server bundle is CJS** on purpose (see gotcha below). The Electron main/preload are built as CJS by electron-vite.
- **Renderer imports from `@kanmer/core` must be `import type`.** Core pulls in Node-only deps (gray-matter, chokidar); the renderer is a browser context. Type-only imports are erased at build. Never import a runtime value from core in `renderer/`.
- **All file writes go through `writeFileAtomic`** (`io.ts`): temp file + `rename`, so the watcher never sees a half-written file. `updated` is stamped on every write.
- **The MCP server must never write to stdout** except MCP protocol frames — stdout *is* the transport. Logs go to `process.stderr`.
- **Frontmatter key order** is canonicalised in `frontmatter.ts` (`KEY_ORDER`) so files round-trip stably; unknown/hand-added keys are preserved. Add new known fields to `KEY_ORDER`.
- **Every board mutation from the GUI goes through `setBoard`** (whole-board save); the settings editor builds the new board object and saves it once.
- **Tool annotations are required** on every MCP tool (`readOnlyHint` / `destructiveHint`).
- **Plugin/skill sync.** The plugin's skills describe the MCP tool surface, so a
  rename that lands on only one side leaves agents following instructions for
  tools that no longer exist. Whenever you add, rename or change a tool or its
  parameters: update `plugins/kanmer/skills/kanmer-workflow/references/tool-reference.md`
  (and the SKILL.md if the *workflow* changed, not just the signature), run
  `npm run plugin:build` to refresh the bundled server, and run
  `npm run plugin:check` — it fails on tool-name drift.
- **Match the surrounding style** — small focused modules, JSDoc on exported functions, no clever one-liners.

---

## 8. Non-obvious gotchas (read before debugging)

1. **gray-matter is CommonJS and does a dynamic `require('fs')`.** If you bundle it into an **ESM** output (e.g. tsup ESM), it throws `Dynamic require of "fs" is not supported`. That's why: the dev server build keeps deps **external**, and the shippable **standalone bundle is CJS** (`tsup.standalone.config.ts`, `noExternal: [/.*/]`), and the Electron main is CJS (Rollup handles the require correctly). Don't "simplify" these to ESM bundles.
2. **YAML parses ISO date strings into JS `Date`.** `created`/`updated` are coerced back to strings via `TimestampSchema` in `types.ts`. Keep that if you add date fields.
3. **`priority` is a string, not an enum.** It became configurable (an id into `board.priorities`). Don't reintroduce a fixed enum. Default list lives in `DEFAULT_PRIORITIES` (`types.ts`) and migrates old boards.
4. **The installed app runs the MCP server as Electron-as-Node.** `connect.ts` registers `command = <Kanmer.exe>`, `args = [<resources/mcp/kanmer-mcp.cjs>, --root, <project>]`, `env = { ELECTRON_RUN_AS_NODE: "1" }`. The standalone bundle must therefore be self-contained (no node_modules at runtime).
5. **electron-builder bundles nothing from `node_modules`** because the GUI's runtime deps are moved to `devDependencies` and everything is bundled into `out/` by electron-vite. If you add a runtime dep the main process needs *unbundled* (rare, e.g. a native `.node`), you must revisit this.
6. **Antivirus + electron-builder:** Windows Defender sometimes quarantines electron-builder's bundled `7za.exe` mid-build (`ENOENT … 7za.exe`). Pinned electron-builder ≥26 fetches 7-Zip fresh and usually avoids it; otherwise restore from quarantine / add a repo exclusion.
7. **The watcher ignores atomic-write temp files** (`.<name>.tmp-*`) and debounces (`watch.ts`). Don't remove the ignore or you'll get double refreshes.
8. **`plugins/kanmer/mcp/kanmer-mcp.cjs` is a committed build artifact** — deliberately, unlike every other `dist/` output. Plugin installs fetch this repo, so the server has to already be there and runnable; there is no build step on the user's side. Refresh it with `npm run plugin:build` whenever the server changes, or installed plugins silently keep running the old server.

---

## 9. Recipes (how to add things)

**Add a new MCP tool** → in `mcp-server/src/index.ts`, call `server.registerTool(name, { title, description, inputSchema (zod raw shape), annotations }, handler)`. Back it with a `KanmerStore` method. Add a check to `smoke.mjs`. Then document it in the plugin's `references/tool-reference.md` and run `npm run plugin:build && npm run plugin:check`. If it mutates the board/items, the GUI reflects it automatically via the watcher.

**Add a new item frontmatter field** → (1) `ItemFrontmatterSchema` + `CreateItemInput`/`UpdateItemPatch` in `types.ts`; (2) `KEY_ORDER` in `frontmatter.ts`; (3) default it in `store.createItem`; (4) surface it in `Editor.tsx` and the MCP `create_item`/`update_item` schemas; (5) a core test; (6) mention it in the plugin tool reference's field-semantics list.

**Add a new board column kind** → extend `ColumnKind` + `BoardConfigSchema` (`types.ts`), `columnList()` (`store.ts`), the `add_column` enum (server), and the Settings editor (`Settings.tsx`).

**Add an IPC call** → channel in `shared/ipc.ts` (`CH` + `KanmerApi`), handler in `main/index.ts`, wrapper in `preload/index.ts`.

---

## 10. Verification checklist (before you call something done)

1. `npm test` — core suite green.
2. `node packages/mcp-server/src/smoke.mjs` — stdio checks green (add one for your change).
3. `npm run typecheck -w @kanmer/gui` — GUI types clean.
4. `npm run build -w @kanmer/gui` — GUI builds.
5. If GUI-facing: `KANMER_SMOKE=1 KANMER_OPEN=<sandbox> npx electron .` boots (exit 0).
6. If the tool surface changed: `npm run plugin:check` passes, and `npm run plugin:build` was re-run so the bundled server isn't stale.
7. The real test: open a project in the GUI, have an agent `create_item`/`move_item` against it, confirm the board live-updates; edit in the GUI, confirm the agent's `get_item` sees it.

---

## 11. Known limitations / roadmap

- Windows installer only so far (macOS/Linux electron-builder targets not configured).
- No custom app icon (uses default Electron icon).
- No card reordering within a column, no due dates, no typed link relations (blocks/blocked-by).
- No automated CI; verification is the manual checklist above.
- Deleting an in-use board column doesn't rewrite referencing items — they fall back to an auto column/group (by design for now). This is a read-side fallback only: `create_item`/`update_item`/`move_item` reject writing a `status` the board doesn't currently define (see `assertKnownStatus` in `store.ts`), so new writes can't create fresh instances of this state — it can only arise from a column later being removed out from under existing items.
- **Concurrent `create_item` id race.** Id allocation reads `counters.json`,
  reconciles against the on-disk max, and writes back ([ids.ts](packages/core/src/ids.ts)).
  Two agents calling `create_item` in the same instant could interleave that
  read-modify-write. Negligible for single-user use, and every other operation
  is safe under concurrency (stateless reads + atomic writes), so multiple
  servers against one `.kanmer` is fine. A lockfile would close it properly.
- **Duplicate registration is confusing, not harmful.** If a user installs the
  plugin *and* registers the server manually (GUI "Connect" or `mcp add`), the
  agent lists all 11 tools twice under different server names. Both work; the
  README tells users to pick one.
