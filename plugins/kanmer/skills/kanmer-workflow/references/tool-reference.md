# Kanmer MCP tool reference

Kept in sync with `packages/mcp-server/src/index.ts` — run
`node scripts/check-plugin-sync.mjs` after changing either side.

## Read tools

| Tool | Purpose | Key params |
|---|---|---|
| `list_board` | Board config: stages (statuses), areas, priorities, id prefixes. Call first. | — |
| `list_items` | Item summaries (see fields below; no body). Archived excluded by default; with `include_archived: true`, archived and active items are returned together and distinguished by the summary's `archived` field. | `type?`, `status?`, `area?`, `label?`, `include_archived?` |
| `get_item` | Full frontmatter + Markdown body of one item. | `id` |
| `search_items` | Full-text search over id, title, body, labels, assignee. | `query`, `type?` |
| `get_links` | Forward links + backlinks for an item, with titles. | `id` |

## Write tools

| Tool | Purpose | Key params |
|---|---|---|
| `create_item` | Create ticket / plan / research. Returns allocated id (e.g. TICK-007). | `type`, `title`, `status?`, `area?`, `priority?`, `assignee?`, `labels?`, `links?`, `body?` |
| `update_item` | Patch frontmatter and/or the body. Omitted fields are left alone, but a supplied `body` **replaces** the whole body — it is not merged. `archived: true` hides from board. `type` **cannot** be changed — it's not in the schema and is silently dropped, not rejected; it determines the item's folder and id prefix, so create a new item and archive the old one instead. | `id`, `title?`, `status?`, `area?`, `priority?`, `assignee?`, `labels?`, `links?`, `body?`, `archived?` |
| `move_item` | Move an item to a workflow stage. Rejects a status that is not on the board — call `list_board` for valid ids. | `id`, `status` |
| `link_items` | Add/remove a structured relation source → target. | `source_id`, `target_id`, `action` (`add`/`remove`) |
| `add_column` | Add a stage, area or priority to the board. `color` is a hex string like `#5b8cff`. Append-only: rejects an id that already exists; cannot remove, rename or reorder — a whole-board replacement (e.g. swapping out the default stages) needs the GUI Settings editor. | `id`, `name`, `kind` (`status`/`area`/`priority`), `color?` |

## Destructive

| Tool | Purpose | Key params |
|---|---|---|
| `delete_item` | Permanently delete an item file. Cannot be undone. Prefer archiving. | `id` |

## What a `list_items` summary contains

Exactly these fields — not "every field except the body": `id`, `type`,
`title`, `status`, `area`, `priority`, `assignee`, `labels`, `updated`,
`archived`. Everything else — `links`, `created`, and the Markdown body — is
left out and requires `get_item`. In particular, a summary with no `links` key
means "not reported here", not "this item has no links" — don't infer the
absence of a relation from a summary.

## Field semantics

- `status` — the single workflow dimension; a column on the human's board.
  Default stages on a fresh board: todo → planning → implementing → review →
  verifying → done. Call `list_board` for the ids that are actually
  configured — older or customised boards commonly differ, and writes to an
  id the board doesn't define are rejected.
- `area` — colour-coded grouping (e.g. UI, API); clusters cards within stage
  columns. A board can legitimately have **no** areas defined (`areas: []`), in
  which case leave the field off items.
- `priority` — id into the board's configurable priority list.
- `assignee` — free-text; the only person field, so it doubles as "who is this
  waiting on" when an item is in review.
- `links` — array of item ids; combined with `[[ID]]` body wiki-links into a
  backlink graph. Links are one-directional; backlinks are derived, not stored.
- `archived` — true hides the item from the board without deleting it.
- `created` / `updated` — ISO-8601 timestamps in the item's frontmatter, stamped
  by the tools on every write. Compare `updated` against today's date to judge
  staleness; it is frontmatter, not a filesystem mtime, so it only moves when an
  item actually changes.
- Bodies are Markdown; `[[ID]]` references render as clickable links in the GUI.

## Item types

Each type lives in its own folder with its own id prefix (configurable):

| Type | Folder | Default prefix | Use for |
|---|---|---|---|
| `ticket` | `.kanmer/tickets/` | `TICK` | A unit of work that appears on the board |
| `plan` | `.kanmer/plans/` | `PLAN` | Coordinating several tickets toward one outcome |
| `research` | `.kanmer/research/` | `RES` | Findings that outlive the conversation |
