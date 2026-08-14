<!-- kanmer:instructions:start — managed by kanmer-setup; edits inside will be overwritten -->
# Kanmer operating instructions

This repo's work is tracked on a Kanmer board in `.kanmer/`.

- Start every session with `get_status`, then `list_board` / `list_items` to find your ticket. `get_doc_gates` shows which documents each stage transition needs.
- Work each ticket on its own branch and worktree: worktree `.worktrees/<id>`, branch `<id>-<slug>`; `take_ticket` records both and moves the stage.
- Stages: backlog → researching → planning → implementing → review → verifying → done — hard document gates guard the transitions.
- Before a ticket leaves Backlog, link a governing doc (`link_doc` → a PRD/FRD/ADR in `/docs/`) or set `docs_todo`.
- Doc pipeline: research.md + impact.md → plan.md → checklist.md → post-implementation-report.md; write proof.md on merged main before Done.
- Add running notes with `append_scratch` (not `set_ticket_doc`) — scratch is the notepad and is never gated.
- Review passes → the PR is merged → the ticket enters Verifying; write proof.md on merged main, move to Done, then close out (record commits/PRs/deployment).
- Archive, don't delete. Reference other items with [[ID]] wiki-links.
- Skills, one per phase: kanmer-tickets (manage), -docs, -research, -plan, -execute, -review, -verify, -closeout, -auto, -report, -groom, -import, -setup.
<!-- kanmer:instructions:end -->

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
        paths.ts          # .kanmer path resolution: v2 area/ticket folders + legacy dirs
        io.ts             # atomic writes (temp + rename), exclusive create, fs helpers
        frontmatter.ts    # parse/serialise Markdown+frontmatter (gray-matter)
        ids.ts            # id allocation: v2 per-prefix + legacy per-type, disk reconcile
        board.ts          # read/write board.yml, defaultBoardConfig(), area prefixes
        version.ts        # version.json (storage format marker)
        activity.ts       # append-only activity.jsonl (derived change log)
        store.ts          # KanmerStore: CRUD, move, take/release, docs, columns
        links.ts          # links + backlinks + blocks/blockedBy, [[wiki]] parsing
        migrate.ts        # v1 → v2 migration (dry-run + real, idempotent)
        watch.ts          # chokidar wrapper (per-file debounced) the GUI subscribes to
        index.ts          # barrel — the package's public API
        *.test.ts         # vitest suites (frontmatter, store, links, migration…)
      tsup.config.ts      # ESM build → dist/

    mcp-server/           # @kanmer/mcp-server — local stdio MCP server
      src/
        index.ts          # McpServer + 20 tools + resources/prompts + stdio transport
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
        kanmer-tickets/   # ticket management + references/tool-reference.md + ticket template
        kanmer-docs/      # repo /docs/ governance: PRD/FRD/ADR authoring + link-or-create
        kanmer-research/  # research.md + impact.md + open-questions phase (Researching)
        kanmer-plan/      # plan.md + checklist.md phase (+ their templates)
        kanmer-execute/   # worktree/branch, checklist, post-implementation-report.md, PR
        kanmer-review/    # 4-doc PR review, PR feedback → tickets, then merge → Verifying
        kanmer-verify/    # Verifying stage: validate on merged main, write proof.md → Done
        kanmer-closeout/  # post-merge: proof finalized, commits/prs/deployment, cleanup
        kanmer-auto/      # clear an area via parallel subagents in conflict-free waves
        kanmer-report/    # board report: standup ("now") or retro ("since <period>")
        kanmer-groom/     # board-editing triage: dedupe, split, archive, doc-gate debt
        kanmer-import/    # GitHub issues → tickets, idempotent (PR feedback → kanmer-review)
        kanmer-setup/     # greenfield/brownfield/upgrade setup + AGENTS.md block
  .claude-plugin/marketplace.json  # Claude marketplace entry (repo-hosted)
  .agents/plugins/marketplace.json # codex marketplace entry (repo-hosted)

  scripts/
    build-plugin.mjs      # copy standalone MCP bundle into plugins/kanmer/mcp/
    check-plugin-sync.mjs # fail if tool names drift from the skill's tool reference

  apps/
    gui/                  # @kanmer/gui — Electron + React desktop app
      electron.vite.config.ts   # electron-vite: bundles everything into out/
      electron-builder.yml      # Windows NSIS installer config
      build/icon.ico            # committed buildResource (regen: scripts/make-icon.mjs)
      scripts/make-icon.mjs     # dependency-free PNG/ICO generator for the app icon
      src/
        main/
          index.ts        # Electron main: window, menu, toasts, IPC handlers, watcher
          settings.ts     # user-global settings (theme, notifications, bounds, recents)
          connect.ts      # one-click per-project `codex/claude mcp add` registration
        preload/
          index.ts        # contextBridge → window.kanmer typed API
          index.d.ts      # global Window typing
        shared/
          ipc.ts          # IPC channel names + KanmerApi contract (main↔renderer)
        renderer/
          index.html
          src/
            main.tsx      # React root
            App.tsx       # top-level state, views, shortcuts, scoped refresh
            components/   # Board, Editor (doc tabs), Standup, ActivityPanel,
                          # ArchivedList, CommandPalette, ChipInput, FilterBar,
                          # Settings, Welcome, QuickAdd
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

## 4. Data model (format 2)

### The `.kanmer/` folder (per project)

```
.kanmer/
  version.json          # { "format": 2 } (+ migratedFrom/migratedAt after upgrade)
  data/
    board.yml           # statuses, areas (with prefixes), priorities, idPrefixes
    counters.json       # last-used numeric id per PREFIX ({ "API": 3, "TICK": 1 })
    activity.jsonl      # append-only change log — derived, safe to delete
  areas/
    api/                # folder name = area id
      API-001/          # folder name = ticket id
        API-001.md      # THE TICKET — governs everything in this folder
        research.md     # ┐
        impact.md       # │ the document pipeline: research + impact → plan
        plan.md         # │ → checklist + proof. proof.md is REQUIRED before
        checklist.md    # │ the ticket may reach the board's final stage.
        proof.md        # ┘
    pr-review/          # default area on new boards (prefix PR)
    _none/              # tickets with no area (prefix from idPrefixes.ticket)
```

**The ticket is the governing unit.** Its id is born from its area's `prefix`
(`API-001`) and is **immutable** — an area change moves the ticket's folder
(`fs.rename`) but never re-ids it, so `[[API-001]]` references stay valid. The
frontmatter `area` is authoritative over folder location: a hand-moved folder
produces a listing warning and reconciles on the next write. Format 1 boards
(flat `tickets/`, `plans/`, `research/` dirs) keep working unmigrated — reads
scan BOTH layouts — and `migrate.ts` upgrades them (fold linked plans/research
into ticket docs, convert orphans to labelled tickets, pin prefixes, re-key
counters, stamp version.json). On format-2 boards, standalone `plan`/`research`
items are rejected at create time — those live inside tickets as documents.

### `board.yml` — drives both tools and GUI columns

```yaml
statuses:   [{ id, name, color? }, …]           # THE workflow dimension = board columns
areas:      [{ id, name, color?, prefix? }, …]  # colour clusters + ticket id prefixes
priorities: [{ id, name, color? }, …]           # configurable (default: low/medium/high/urgent)
idPrefixes: { ticket: TICK, plan: PLAN, research: RES }  # _none fallback + legacy items
```

Area `prefix` is 2–6 uppercase alphanumerics, derived from the id when unset
(`areaPrefix()` in board.ts), and uniqueness — including *among* the
`idPrefixes` values and against them — is enforced on every board write. The
final stage's configured document-gate boundary is re-checked whenever a board
write changes which stage is last, and a ticket cannot be *created* directly in the final stage
either. `status` is the only workflow axis, with six default stages:

```
todo → planning → implementing → review → verifying → done
```

The FIRST stage is where new items land; the LAST stage is governed by the
resolved configured document gates. A
`phases:` array in a pre-consolidation `board.yml` is stripped by zod on read;
unknown status values on items still render via the Board's `mergeColumns`
fallback (read-side only — writes reject unknown ids).

### An item file (frontmatter is what the GUI edits; body is free Markdown)

```markdown
---
id: API-001
type: ticket           # ticket | plan | research (v2 boards: ticket only)
title: …
status: implementing   # the workflow stage = board column
area: api              # optional; clusters + colours the card, owns the folder
priority: high         # a string id into board.priorities
due: 2026-09-01        # optional date-only deadline
order: 20              # optional fractional sort key (manual ordering)
assignee: claude
taken_at: 2026-08-13T…Z  # ┐ set while an agent works the ticket
branch: feat/x           # │ (take_ticket writes, release clears)
worktree: wt/x           # ┘
labels: [mcp]
links: [API-002]       # structured relations (tool-queryable)
blocks: [API-003]      # this item blocks API-003; blocked-by is derived
archived: false        # hidden from the board unless the Archived view
created: 2026-08-12T…Z
updated: 2026-08-12T…Z
---
Body Markdown. Reference other items with [[API-002]] wiki-links.
```

All the new keys are optional and omitted when unset, so old files gain zero
noise on rewrite. **Linking is two mechanisms** resolved into one backlink
graph: the `links:` frontmatter array *and* inline `[[ID]]` wiki-links in the
body; `blocks:` adds typed dependency edges on top (see `links.ts`). Every
mutation appends a `{ts, id, op, field, from, to, actor}` line to
`activity.jsonl` — a derived convenience, never consulted for state.

---

## 5. The three surfaces in detail

### `@kanmer/core` (packages/core)
The only place that touches `.kanmer` files. Public API via `index.ts`. Key entry point: **`KanmerStore`** (`store.ts`) — construct with a project root, then `listItems(WithWarnings)/getItem/createItem/updateItem/moveItem/deleteItem/searchItems`, `takeTicket/releaseTicket`, `getDoc/getDocWithVersion/setDoc/getTicketDocsInfo`, `getBoard(WithSource)/setBoard/addColumn/updateColumn/removeColumn/reorderColumns`, `detectFormat`, `getActivity`. `init()` maintains whichever format exists (it never stamps v2 onto a v1 board — that's `migrateToV2`'s job). Links live in `links.ts` (`getLinkGraph`, `linkItems`, `computeBlockedIds`, `parseWikiLinks`). Everything is covered by `*.test.ts` (vitest), including a v1 fixture suite and the migration round-trip.

### `@kanmer/mcp-server` (packages/mcp-server)
`index.ts` builds an `McpServer` and registers **20 tools**, plus MCP resources (`kanmer://board`, `kanmer://items/{id}` with `subscribe` support) and two prompts (`standup`, `take-ticket`), then connects a `StdioServerTransport`. Root resolution in `root.ts`. **Init is lazy**: boot never calls `store.init()` — a read-only session (or a host that spawns the server in a workspace nobody opted into Kanmer for) must not create `.kanmer/` just by connecting. Write tools call `ensureInit()` first, which creates the skeleton once on the first actual write; read tools degrade to empty/default results when `.kanmer/` doesn't exist yet. Write tools also stamp the activity-log actor from the client's identity, and destructive ops (`delete_item`, `remove_column` with `migrate_to`) confirm via elicitation when the host supports it. Two builds:
- `dist/index.js` — ESM, deps external (for dev / `node …`).
- `dist/standalone/kanmer-mcp.cjs` — self-contained CJS, everything bundled (shipped inside the GUI, run via Electron-as-Node).

**Tools** (all carry annotations so codex approval modes / Claude read-write split behave):
- Read (`readOnlyHint`): `get_status`, `list_board`, `list_items`, `get_item`, `get_ticket_doc`, `search_items`, `get_links`, `get_activity`
- Write: `create_item`, `create_items`, `update_item`, `move_item`, `take_ticket`, `set_ticket_doc`, `link_items`, `add_column`, `update_column`, `reorder_columns`
- Destructive (`destructiveHint`): `delete_item`, `remove_column`

The plugin's `kanmer-tickets` skill documents this surface for agents — see the
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
| `npm run build:core` / `npm run build:server` | build just one package |
| `npm test` | core **and GUI** vitest suites |
| `npm run typecheck -w @kanmer/gui` | GUI type check (each package has a `typecheck` script) |
| `npm run app` | build + launch the GUI |
| `npm run dev:gui` | GUI with hot reload |
| `npm run dist` | build everything **and** produce `apps/gui/release/Kanmer Setup <v>.exe` |
| `npm run plugin:build` | build, then copy the standalone MCP bundle into `plugins/kanmer/mcp/` |
| `npm run plugin:check` | fail if MCP tool names drift from the skill's tool reference **or if the committed plugin bundle differs from a fresh build (requires `npm run build` first)** |
| `npm run inspect` | build, then open MCP Inspector against the server (root `./sandbox`) |
| `node packages/mcp-server/src/smoke.mjs` | stdio smoke test against the built server |
| `npm run smoke:protocol` | raw-JSON-RPC stdio check against every protocol version the SDK supports, plus the per-request `_meta` client-identity path |
| `npm run verify:agents-block` | end-to-end check of the `kanmer-setup` AGENTS.md managed block (insert, refresh, idempotence, CLAUDE.md pointer, malformed markers) |
| `node scripts/agents-block.mjs <repo>` | write/refresh that block in a target repo (what `kanmer-setup` calls) |

**Smoke test env overrides** (in `smoke.mjs`): `KANMER_SERVER=<path>` points at a different server entry (e.g. the standalone bundle); `KANMER_NODE=<electron.exe>` runs it via Electron-as-Node (sets `ELECTRON_RUN_AS_NODE=1`). Example — test the packaged server exactly as shipped:
```bash
KANMER_NODE="apps/gui/release/win-unpacked/Kanmer.exe" \
KANMER_SERVER="apps/gui/release/win-unpacked/resources/mcp/kanmer-mcp.cjs" \
node packages/mcp-server/src/smoke.mjs
```

**GUI boot smoke** (exits after render), from `apps/gui`:
```bash
KANMER_SMOKE=1 KANMER_OPEN=<projectDir> npx electron . --user-data-dir=<a fresh dir>
```
`--user-data-dir` is **not optional** when running from source: Electron takes
`app.getName()` from `apps/gui/package.json`, so the scoped name `@kanmer/gui`
makes userData `%APPDATA%\@kanmer/gui` and `requestSingleInstanceLock()`
returns false on that path even with nothing else running (§11). Smoke mode now
exits **1** with a message when that happens, and also when the renderer loads
without the window reaching `ready-to-show` — the check used to exit 0 either
way, so it could not fail.

---

## 7. Conventions & guidelines

- **TypeScript strict everywhere** (`tsconfig.base.json`). No `any` escapes; run the package `typecheck` scripts.
- **ESM vs CJS is deliberate.** `@kanmer/core` and the ESM server build are ESM (`"type": "module"`). The **standalone server bundle is CJS** on purpose (see gotcha below). The Electron main/preload are built as CJS by electron-vite.
- **Renderer imports from `@kanmer/core` must be `import type`.** Core pulls in Node-only deps (gray-matter, chokidar); the renderer is a browser context. Type-only imports are erased at build. Never import a runtime value from core in `renderer/`.
- **All file writes go through `writeFileAtomic`** (`io.ts`): temp file + `rename`, so the watcher never sees a half-written file. Item *creation* goes through `writeFileExclusive` (temp + `fs.link`) so two concurrent creates can't claim the same id. `updated` is stamped on every write that actually changes the file — a no-op patch returns the item unchanged without touching disk.
- **The MCP server must never write to stdout** except MCP protocol frames — stdout *is* the transport. Logs go to `process.stderr`.
- **Frontmatter key order** is canonicalised in `frontmatter.ts` (`KEY_ORDER`) so files round-trip stably; unknown/hand-added keys are preserved. Add new known fields to `KEY_ORDER`.
- **Every board mutation from the GUI goes through `setBoard`** (whole-board save); the settings editor builds the new board object and saves it once.
- **Tool annotations are required** on every MCP tool (`readOnlyHint` / `destructiveHint`).
- **Plugin/skill sync.** The plugin's skills describe the MCP tool surface, so a
  rename that lands on only one side leaves agents following instructions for
  tools that no longer exist. Whenever you add, rename or change a tool or its
  parameters: update `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md`
  (and the SKILL.md if the *workflow* changed, not just the signature), run
  `npm run plugin:build` to refresh the bundled server, and run
  `npm run plugin:check` — it fails on tool-name drift.
- **Document writes carry an optional version token.** `getDocWithVersion`/`get_ticket_doc` return a content hash; passing it back as `setDoc`'s `expectedVersion` / `set_ticket_doc`'s `expected_version` turns a concurrent overwrite into a conflict, exactly like `expectedUpdated` on `updateItem`. Omitting it is last-write-wins. Documents have no frontmatter to hold `updated`, which is why this is a hash and not a timestamp.
- **Renderer logic that could be pure, is.** `renderer/src/lib/` holds the DOM-free modules — `markdown.ts`, `board.ts` (column lookups, the blocked/overdue rules, drop-position and optimistic-order arithmetic) and `standup.ts` (the whole standup report plus its markdown). They are the **only** renderer code with vitest coverage, so put new logic there rather than in JSX, export it, and take `now`/`today` as an argument instead of calling `Date.now()` inside.
- **`board.ts`'s `blockedIds` is the renderer's only copy of core's live-blocker rule** (`links.ts computeBlockedIds`), consumed by both the card badges and the Standup view. Likewise `Settings.tsx validateDraft()` mirrors `board.ts assertUniquePrefixes()`. The renderer may only `import type` from core, so these cannot share code — change one, change the other.
- **`plugin:check` sees tool names and bundle bytes only.** Everything below `## Field semantics` in `references/tool-reference.md` is deliberately invisible to it (`check-plugin-sync.mjs:41-45` splits the document there so field names aren't mistaken for tools) — re-read that prose by hand whenever the data model changes.
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
8. **`plugins/kanmer/mcp/kanmer-mcp.cjs` is a committed build artifact** — deliberately, unlike every other `dist/` output. Plugin installs fetch this repo, so the server has to already be there and runnable; there is no build step on the user's side. Refresh it with `npm run plugin:build` whenever the server changes, or installed plugins silently keep running the old server. Core compiles *into* it, so **core-only fixes need the rebuild too**; `plugin:check` now sha256s the committed bundle against a fresh build so a stale one fails loudly instead of silently.
9. **`order` is column-scoped; the board renders by area.** `computeOrder` filters on `status` only (`store.ts:697-698`), while `Board.tsx` groups cards by area inside each column (`groupByArea`). Any drag-and-drop neighbour computation must use `columnCards(items, statusId)` (`lib/board.ts:70`), never a group's cards — otherwise "drop above this card" silently means a different slot, and a single-area test board will not reveal it. `Card` is `memo`ized (`Board.tsx:221`), so pass badge and drop-hint state to it as primitives (`blocked: boolean`, `overdue: boolean`, `dropEdge: "before" | "after" | null`), never a `Set` or object rebuilt each render. `e.stopPropagation()` on the card's `onDrop` is load-bearing: without it the cell handler also fires and issues a second, position-less `moveItem`.

---

## 9. Recipes (how to add things)

**Add a new MCP tool** → in `mcp-server/src/index.ts`, call `server.registerTool(name, { title, description, inputSchema (zod raw shape), annotations }, handler)`. Back it with a `KanmerStore` method. Add a check to `smoke.mjs`. Then document it in the plugin's `references/tool-reference.md` and run `npm run plugin:build && npm run plugin:check`. If it mutates the board/items, the GUI reflects it automatically via the watcher.

**Add a new item frontmatter field** → (1) `ItemFrontmatterSchema` + `CreateItemInput`/`UpdateItemPatch` in `types.ts`; (2) `KEY_ORDER` in `frontmatter.ts`; (3) default it in `store.createItem`; (4) surface it in `Editor.tsx` and the MCP `create_item`/`update_item` schemas; (5) a core test; (6) mention it in the plugin tool reference's field-semantics list.

**Add a new board column kind** → extend `ColumnKind` + `BoardConfigSchema` (`types.ts`), `columnList()` (`store.ts`), the `add_column` enum (server), and the Settings editor (`Settings.tsx`).

**Add an IPC call** → channel in `shared/ipc.ts` (`CH` + `KanmerApi`), handler in `main/index.ts`, wrapper in `preload/index.ts`.

---

## 10. Verification checklist (before you call something done)

1. `npm test` — core + GUI suites green.
2. `node packages/mcp-server/src/smoke.mjs` **and** `node packages/mcp-server/src/smoke-protocol.mjs` — stdio checks green (add one for your change).
3. `npm run typecheck -w @kanmer/gui` — GUI types clean.
4. `npm run build -w @kanmer/gui` — GUI builds.
5. If GUI-facing: `KANMER_SMOKE=1 KANMER_OPEN=<sandbox> npx electron . --user-data-dir=<fresh dir>` boots (exit 0). Non-zero means it did not render — see §6.
6. If the server changed: `npm run build && npm run plugin:build && npm run plugin:check` (the check now verifies the committed bundle's bytes, not just tool names), plus both smoke scripts with `KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs`.
7. The real test: open a project in the GUI, have an agent `create_item`/`move_item` against it, confirm the board live-updates; edit in the GUI, confirm the agent's `get_item` sees it.
8. If the setup skill or its managed block changed: `node scripts/verify-agents-block.mjs`.

---

## 11. Known limitations / roadmap

- Windows installer only so far (macOS/Linux electron-builder targets not configured).
- No automated CI; verification is the manual checklist above.
- Column removal: the MCP `remove_column` tool refuses while items reference the column (or migrates them with `migrate_to`), but the GUI Settings editor's whole-board save can still drop an in-use column — those items fall back to an auto column/group on read (`mergeColumns`), and writes to the now-undefined id are rejected (`assertFieldAgainstBoard` in `store.ts`).
- Two concurrent creates that share the TICK fallback prefix in *different* undeclared areas could double-allocate an id number — only reachable when a v2 board's `areas` list has been emptied (the exclusive-create lock is per file path). Narrowed: `createItem` now refuses an id that `locateItem` can already resolve (`store.ts:519-522`), so only a genuine concurrent-create window remains.
- **The MCP SDK caps at protocol `2025-11-25`.** `@modelcontextprotocol/sdk@^1.30.0` contains no `2026-07-28` support, so `ttlMs`/`cacheScope` on `tools/list` are unavailable and no current host sends the spec's `io.modelcontextprotocol/client` identity key. The server *does* read it, and that branch is **live, not dead**: the SDK forwards `params._meta` to handlers on every protocol (`shared/protocol.js:321`), and `smoke-protocol.mjs` proves it by sending a hand-written frame carrying the key and asserting the activity actor comes back as `future-host`. So actor attribution is forward-compatible today and falls back to `clientInfo`/`getClientVersion()` in practice. `smoke-protocol.mjs` also covers the back-compat run against `2025-11-25`, `2025-06-18`, `2025-03-26` and `2024-11-05`. Revisit `tools/list` caching when the SDK ships the revision.
- **Migration has no agent-reachable entry point.** `migrateToV2` is reachable only from the GUI (`main/index.ts` `CH.migrate`); there is no MCP tool. `kanmer-setup`'s Upgrade mode therefore asks the user to click "Migrate to v2" in the app, and a plugin user with no GUI installed cannot upgrade a v1 board. Migration *is* now resumable and refuses colliding boards, so an interrupted run is recoverable — but only from the GUI.
- **Keyboard stage moves (Ctrl+←/→) set no position.** Drag-and-drop now writes an insertion point; the keyboard path (`Board.tsx:303-309` → `App.tsx:352`) changes the stage and leaves the card's existing `order`, so it can land somewhere other than where the eye expects. The command palette's Move ▸ verb has the same gap. Giving either an insertion point needs a "move within column" mode that does not exist.
- **Running from source does not launch.** Electron takes `app.getName()` from `apps/gui/package.json`, so a from-source run gets the scoped name `@kanmer/gui`, userData `%APPDATA%\@kanmer/gui`, and `requestSingleInstanceLock()` returning **false** on that mixed-separator path with no other instance running — `npx electron .`, `npm run app` and `npm run dev:gui` then quit in ~1 s. Workaround: `--user-data-dir=<fresh dir>`. The **packaged** app is unaffected (electron-builder sets `productName: Kanmer` → `%APPDATA%\Kanmer`). A one-line `app.setName("Kanmer")` would fix it but moves where dev settings live and makes a dev run share the installed app's lock, so it is left as a product decision. The boot smoke no longer hides this: it exits 1 rather than 0.
- **The `beforeunload` confirm on window close is unverified in this Electron configuration** (`sandbox: false`, no `will-prevent-unload` handling in `main/index.ts`). Historically version-dependent; no harness exists to settle it. Every *in-app* way of leaving a dirty editor — card click, Close, wiki-link, tab switch, project switch, palette jump, Escape, standup line, activity panel, toast click — is guarded by `trySelect` (`App.tsx:117-125`) or `tryTab` (`Editor.tsx:296-299`).
- **The checklist tab never linkifies `[[ID]]`.** `Editor.tsx:827-854` parses lines to JSX itself and never calls `renderMarkdown`, so a wiki-link inside a checklist item is literal text.
- **Agent-change toast suppression is ticket-granular, not doc-granular.** A GUI write to `checklist.md` suppresses the toast for a concurrent agent write to `research.md` on the same ticket within 2 s — `toastKey()` maps every pipeline document to its ticket folder (`main/index.ts:270-280`) and `ownWrites` is keyed by that. Conflict *detection* is unaffected; only the toast.
- **A doc save that fails for any reason shows the conflict banner.** `Editor.tsx:729-732` sets `conflict` from the caught error whatever it was, so a disk-full or permission failure also offers "Overwrite anyway" — which re-issues the save without `expectedVersion` and will fail the same way.
- **The Standup's Blocked section lists blocked items but does not name their blockers.** `kanmer-standup/SKILL.md:68` suggests naming them from `get_links` "when it matters"; doing so is an IPC call per blocked item, so the GUI lists the items only (`lib/standup.ts:53-56`).
- **The GUI takes tickets as `gui`, and does not set an assignee at all.** The store's default actor is `"gui"` and the Electron main never overrides it (`store.ts:88`; no `setActor` call in `main/`), so every GUI mutation is attributed to the app rather than a named human. The palette's Take sends only `{ branch }` (`App.tsx:386`) and core writes `assignee` only when supplied (`store.ts:771`), so unlike MCP's `take_ticket` — which defaults it to the client name — the GUI leaves `assignee` untouched. The take modal's hint text (`App.tsx:819`) still says the assignee defaults to `"gui"`; it does not.
- ~~Concurrent `create_item` id race~~ **closed by exclusive create.** The item
  file itself is the allocation lock: `createItem` computes a candidate id and
  claims it with `writeFileExclusive` ([io.ts](packages/core/src/io.ts)) — a
  temp-file + `fs.link` pair that fails `EEXIST` if the id was taken, retried
  with the next number. Deliberately **not** a lockfile: lockfiles need
  stale-lock timeouts and break when a holder crashes; exclusive-create is
  crash-safe by construction and keeps `io.ts` the only file-touching layer.
- **Duplicate registration is confusing, not harmful.** If a user installs the
  plugin *and* registers the server manually (GUI "Connect" or `mcp add`), the
  agent lists all the tools twice under different server names. Both work; the
  README tells users to pick one.
