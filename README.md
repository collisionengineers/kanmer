# Kanmer

A Kanban / ticket / plan / research manager where **AI agents and a human share one dataset**.

Agents (codex, Claude Code, Claude Desktop — any MCP client) create and update work through a local **MCP server**; you review, re-arrange and edit the same work through a **Windows desktop GUI**. Both sides operate on one source of truth: a `.kanmer/` folder of Markdown-with-frontmatter files inside each project. Neither talks to the other — they sync through the files, and the GUI live-reloads when anything changes on disk.

```
codex / Claude / any MCP client ──stdio──► kanmer-mcp ─┐
                                                        ├─► .kanmer/  (Markdown + frontmatter = source of truth)
              You ──► Kanmer GUI (Electron) ────────────┘        ▲
                          └── watches .kanmer/ ──────────────────┘  (live reload on external change)
```

## Layout

```
packages/core         Shared store: types, frontmatter, ids, links, watcher
packages/mcp-server   Local stdio MCP server (11 tools) — the agent surface
apps/gui              Electron + React kanban desktop app — the human surface
examples/             Example codex config
```

## The `.kanmer/` folder

Created automatically in each project (by the GUI's "Open project" or on MCP server start):

```
.kanmer/
  data/board.yml       Stages (kanban columns), areas, priorities, id prefixes
  data/counters.json   Per-type id counters
  tickets/  TICK-001.md ...
  plans/    PLAN-001.md ...
  research/ RES-001.md ...
```

Each item is Markdown with frontmatter; the body may reference other items with `[[ID]]` wiki-links, and `links:` holds structured relations. Both are resolved into a backlink graph.

```markdown
---
id: TICK-001
type: ticket
title: Wire up create_item tool
status: implementing
area: api
priority: high
labels: [mcp]
links: [PLAN-001]
---
Implements the tool. See [[PLAN-001]] and [[RES-001]].
```

**One workflow dimension.** A ticket has a single `status` — the stage it's at.
The default stages are the board's columns, left to right:

```
Todo → Planning → Implementing → Review → Verifying → Done
```

`area` is an orthogonal, colour-coded grouping (UI, API, Infra…) that clusters
cards *within* each column. Stages, areas and priorities are all editable in the
app's Settings.

## Install — the easy way (Windows installer)

Build a real double-click installer:

```bash
npm run setup      # install deps + build everything
npm run dist       # produce apps/gui/release/Kanmer Setup <version>.exe
```

Run `Kanmer Setup ….exe` → Start-Menu shortcut, normal desktop app. The MCP server ships **inside** the app (`resources/mcp/kanmer-mcp.cjs`) and runs via Electron-as-Node, so **no separate Node install is needed** on the target machine.

**Connect an agent with one click:** open a project in Kanmer → **⚙ Settings → Connect an AI agent → Connect codex / Connect Claude Code**. It runs the agent's `mcp add` command for you (with a copy-paste fallback shown if the CLI isn't on `PATH`). Restart the agent and it can drive that project's board.

> **Antivirus note:** electron-builder downloads a 7-Zip helper that Windows Defender sometimes false-positive quarantines. If `npm run dist` fails with `ENOENT … 7za.exe`, restore the file from Defender's quarantine (or add a folder exclusion for the repo) and re-run. electron-builder ≥26 (pinned here) fetches it fresh, which usually avoids this.

## Develop / run from source

```bash
npm install
npm run build            # core + mcp-server
npm test                 # core test suite
npm run app              # build + launch the GUI
# or hot-reload dev:
npm run dev:gui
```

Click **Open project folder…** and pick any project (recently opened folders are listed, and the last one re-opens on launch). Kanmer creates/loads its `.kanmer/` folder there.

- **Board** — one row of workflow-stage columns. Drag cards between stages to move them; within each column cards **cluster by area** under colour-coded sub-labels and carry an area stripe.
- **Editor** — click a card to edit every frontmatter field (incl. **stage**, **area**, configurable **priority**) and the Markdown body; `[[ID]]` gets **autocomplete**; **Archive** hides an item, and Delete asks first.
- **Search + filter bar** — filter by area, priority, assignee, label; toggle archived.
- **Settings** (gear) — add/rename/recolour/reorder/delete **stages, areas, priorities**, edit **id prefixes**, and switch **theme** — all written to `board.yml`/app settings, reflected instantly. No file editing required.
- **Inline quick-add** — type a title into any column's “+ card” and press Enter; it gets an auto id.

## Install as a plugin (Claude Code & codex) — recommended for agents

The plugin bundles the MCP server **plus workflow skills and templates**, so the
agent knows *how* to use the board, not just that it can. Requires Node ≥20.

**Claude Code:**

```bash
claude plugin marketplace add collisionengineers/kanmer
```

```bash
claude plugin install kanmer@kanmer
```

**codex:**

```bash
codex plugin marketplace add collisionengineers/kanmer
```

Then install **kanmer** from `/plugins`.

The plugin ships three skills:

| Skill | What it does |
|---|---|
| `kanmer-workflow` | The working loop — a ticket per unit of work, moved through the stages as you go — plus ticket/plan/research body templates. |
| `kanmer-standup` | Board status report: in flight, in review, up next, recently done, flags. |
| `kanmer-onboard` | First-time setup: propose areas from the codebase, seed the backlog from TODOs/roadmaps. |

> Use **either** the plugin **or** a manual registration (the GUI's Connect
> button / `mcp add`) — with both, the agent lists all the tools twice. Harmless,
> but confusing to reason about.

## Connect an agent manually (MCP)

The server speaks MCP over **stdio**. It resolves the project root from `--root`, then `KANMER_ROOT`, then the working directory.

**codex** — add to your project's `.codex/config.toml` (see [examples/codex-config.toml](examples/codex-config.toml)):

```toml
[mcp_servers.kanmer]
command = "node"
args = ["C:/Users/Alex/Documents/GitHub/kanmer/packages/mcp-server/dist/index.js"]
cwd = "C:/path/to/your/project"
```

**Claude Code** — from your project folder:

```bash
claude mcp add kanmer -- node C:/Users/Alex/Documents/GitHub/kanmer/packages/mcp-server/dist/index.js --root .
```

### Tools

Read: `list_board`, `list_items`, `get_item`, `search_items`, `get_links`
Write: `create_item`, `update_item`, `move_item`, `link_items`, `add_column`
Destructive: `delete_item`

Items carry a `status` (the workflow stage), a configurable `area` (colour-coded, groups cards within a stage) and `priority`, and can be `archived` (hidden from the board, via `update_item`). `add_column` manages stages, areas and priorities.

Read tools carry `readOnlyHint`; `delete_item` carries `destructiveHint`, so codex approval modes and Claude's read/write split behave correctly.

## Verify end-to-end

```bash
# 1. Core unit tests
npm test

# 2. MCP server over real stdio (spawns the server, exercises every tool)
node packages/mcp-server/src/smoke.mjs

# 3. GUI boots and renders (opens the window briefly, then exits)
npm run build -w @kanmer/gui
cd apps/gui && KANMER_SMOKE=1 KANMER_OPEN="C:/path/to/project" npx electron .
```

```bash
# 4. Plugin: bundled server is current and its skills match the tool surface
npm run plugin:build && npm run plugin:check
```

**The real test — human + agent, one dataset:** open a project in the GUI, then have codex `create_item` / `move_item` against the same folder. The board updates live. Edit a card's frontmatter in the GUI, then have codex `get_item` — it sees your change.

## Not in this MVP

Installer/MCPB packaging, remote/multi-user sync, auth, comment history, an in-app board-config editor (edit `data/board.yml` by hand), and a full graph view. All are natural follow-ups.
