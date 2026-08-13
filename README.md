# Kanmer

A Kanban / ticket manager where **AI agents and a human share one dataset**.

Agents (codex, Claude Code, Claude Desktop — any MCP client) create and update work through a local **MCP server**; you review, re-arrange and edit the same work through a **Windows desktop GUI**. Both sides operate on one source of truth: a `.kanmer/` folder of Markdown-with-frontmatter files inside each project. Neither talks to the other — they sync through the files, and the GUI live-reloads when anything changes on disk.

```
codex / Claude / any MCP client ──stdio──► kanmer-mcp ─┐
                                                        ├─► .kanmer/  (Markdown + frontmatter = source of truth)
              You ──► Kanmer GUI (Electron) ────────────┘        ▲
                          └── watches .kanmer/ ──────────────────┘  (live reload on external change)
```

## Layout

```
packages/core         Shared store: types, frontmatter, ids, links, docs, activity, migration, watcher
packages/mcp-server   Local stdio MCP server (20 tools) — the agent surface
apps/gui              Electron + React kanban desktop app — the human surface
examples/             Example codex config
```

## The `.kanmer/` folder

Created in a project the first time something is actually written to the board
(the GUI's "Open project", or an agent's first write — a read-only MCP session
never creates it):

```
.kanmer/
  version.json          { "format": 2 } — storage format marker
  data/board.yml        Stages (kanban columns), areas (+ id prefixes), priorities
  data/counters.json    Per-prefix id counters
  data/activity.jsonl   Append-only change log (derived — safe to delete)
  areas/
    api/                One folder per area (folder name = area id)
      API-001/          One folder per ticket (folder name = ticket id)
        API-001.md      THE TICKET — governs everything in this folder
        research.md     What was learned for it
        impact.md       The files/modules the change touches
        plan.md         Written from research + impact
        checklist.md    The plan as tickable steps
        proof.md        Evidence it works — REQUIRED to reach the final stage
    pr-review/          Default area on new boards (prefix PR)
    _none/              Tickets with no area (prefix TICK)
```

**The ticket is the governing unit.** Its id comes from the area it was born in
(`API-001`) and never changes — moving a ticket to another area moves its
folder, not its id, so `[[API-001]]` references stay valid forever. The five
pipeline documents live beside the ticket file, and `proof.md` is enforced: the
board rejects moving a ticket to the final stage without it.

Each item is Markdown with frontmatter; the body may reference other items with `[[ID]]` wiki-links, `links:` holds structured relations, and `blocks:` holds dependency edges (blocked-by is derived, never stored).

```markdown
---
id: API-001
type: ticket
title: Wire up create_item tool
status: implementing
area: api
priority: high
due: 2026-09-01
assignee: claude
taken_at: 2026-08-13T09:12:00.000Z
branch: feat/create-item
labels: [mcp]
links: [API-002]
---
Implements the tool. See [[API-002]].
```

**One workflow dimension.** A ticket has a single `status` — the stage it's at.
The default stages are the board's columns, left to right:

```
Todo → Planning → Implementing → Review → Verifying → Done
```

`area` is an orthogonal, colour-coded grouping (UI, API, Infra…) that clusters
cards *within* each column. Stages, areas and priorities are all editable in the
app's Settings — or by agents through the board-management tools.

**Upgrading an old board:** projects created before format 2 (flat `tickets/`,
`plans/`, `research/` folders) keep working unmigrated. The GUI shows a
"Migrate to v2" banner when it opens one: the migration moves tickets into
their folders, folds legacy plans/research into the tickets they relate to,
and converts orphans to labelled tickets so nothing is lost. Ids never change.

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

- **Board** — one row of workflow-stage columns. Drag cards between stages (optimistically — they land instantly); within each column cards **cluster by area** under colour-coded sub-labels, carry an area stripe, and show a ⛏ badge while an agent has them taken.
- **Editor** — click a card for the frontmatter fields plus **document tabs** (Ticket | Research | Impact | Plan | Checklist | Proof) — the checklist renders as live checkboxes. Saves are **diff-based** (only the fields you changed), concurrent agent edits re-sync live, and a same-field conflict offers Keep mine / Take theirs. `[[ID]]` gets **autocomplete**; labels and links are chip editors with suggestions.
- **Standup view** — in flight (with branch), in review, up next, recently done, blocked, overdue — with **Copy as Markdown**, matching the agent skill's output.
- **Activity** — a bell with the change feed (who did what, when); native Windows toasts when an agent changes the board while you're away, in-app toasts while you're looking.
- **Archived view** — restore, or permanently delete behind a two-click confirm. Everywhere else, delete means archive.
- **Search + filter bar** — filter by area, priority, assignee, label; `Ctrl+K` opens a command palette; full keyboard support (`Ctrl+N` new card, `Ctrl+←/→` moves a focused card between stages).
- **Settings** (gear) — add/rename/recolour/reorder/delete **stages, areas, priorities**, edit **id prefixes**, switch **theme** (dark / light / system) and toggle notifications — validated before saving, reflected instantly.
- **Inline quick-add** — type a title into any column's "+ card" (or an area header's "+") and press Enter; it gets an auto id in that area's prefix.

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
| `kanmer-workflow` | The ticket lifecycle — orient with `get_status`, take a ticket (branch/worktree recorded), work the research → impact → plan → checklist → proof pipeline, move stages as you go, release when done — plus templates for the ticket body and all five documents. |
| `kanmer-standup` | Fact-based board report from the activity log and live summaries: in flight (with branches), in review, up next, recently done, blocked, overdue, flags. |
| `kanmer-setup` | Setup in three modes — **greenfield** (propose areas + seed a backlog), **brownfield** (mine the codebase for a starter backlog), **upgrade** (drive the v1 → v2 migration) — and it installs Kanmer operating instructions at the **top of the repo's `AGENTS.md`** (a marker-delimited managed block, refreshed idempotently), so any agent that opens the repo knows the board exists. |

> Use **either** the plugin **or** a manual registration (the GUI's Connect
> button / `mcp add`) — with both, the agent lists all the tools twice. Harmless,
> but confusing to reason about.

## Connect an agent manually (MCP)

The server speaks MCP over **stdio**. It resolves the project root from `--root`, then `KANMER_ROOT`, then the working directory.

**codex** — add to your project's `.codex/config.toml`, replacing `<kanmer-repo>` with wherever you cloned this repo (see [examples/codex-config.toml](examples/codex-config.toml)):

```toml
[mcp_servers.kanmer]
command = "node"
args = ["<kanmer-repo>/packages/mcp-server/dist/index.js"]
cwd = "C:/path/to/your/project"
```

**Claude Code** — from your project folder:

```bash
claude mcp add kanmer -- node <kanmer-repo>/packages/mcp-server/dist/index.js --root .
```

### Tools

Read: `get_status`, `list_board`, `list_items`, `get_item`, `get_ticket_doc`, `search_items`, `get_links`, `get_activity`
Write: `create_item`, `create_items`, `update_item`, `move_item`, `take_ticket`, `set_ticket_doc`, `link_items`, `add_column`, `update_column`, `reorder_columns`
Destructive: `delete_item`, `remove_column`

Items carry a `status` (the workflow stage), a configurable `area` (colour-coded, groups cards within a stage, and gives tickets their id prefix), `priority`, optional `due` / `blocks` / manual `order`, taken state (`taken_at`/`branch`/`worktree`), and can be `archived` (hidden from the board, via `update_item`). The column tools manage stages, areas and priorities end-to-end — including safe removal with `migrate_to`.

Read tools carry `readOnlyHint`; `delete_item` and `remove_column` carry `destructiveHint`, so codex approval modes and Claude's read/write split behave correctly. The server never creates `.kanmer/` just by being started — only an actual write does.

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

## Not yet

Remote/multi-user sync, auth, macOS/Linux installers, and a full graph view. All are natural follow-ups.
