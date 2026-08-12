---
name: kanmer-workflow
description: Track and organise work in Kanmer, the file-based kanban shared live with a human's board GUI. Use this whenever the user asks to plan work, track tasks, create or update tickets, manage a backlog, record research, break a feature into steps, or asks "what's on the board" / "add a ticket for this" — and also proactively when you start a multi-step piece of work in a project that contains a .kanmer folder, so the human can follow your progress on their board.
---

# Working with Kanmer

Kanmer stores tickets, plans and research notes as Markdown files in the
project's `.kanmer/` folder. The human sees the same data on a live kanban
board (the Kanmer desktop app), so every item you create or move is instantly
visible to them — treat the board as your shared workspace, not a log.

All access goes through the `kanmer` MCP tools. Never edit `.kanmer/` files
directly; the tools keep ids, timestamps and frontmatter consistent.

## The working loop

1. **Orient first.** Call `list_board` once per session for the stages, areas
   and priorities — ids vary per project, and inventing one silently mis-files
   the item (`move_item`/`create_item`/`update_item` reject a status the board
   doesn't define). Default stages **on a fresh board**: todo → planning →
   implementing → review → verifying → done. Older boards commonly differ —
   e.g. a single `in-progress` stage instead of `planning`/`implementing`. The
   `list_board` result you just fetched defines which stages exist and their
   order; never assume the six defaults. Then `list_items` for current state,
   and `search_items` before creating: if something close already exists,
   update or link it rather than filing a near-duplicate.
2. **One ticket per unit of work**, created before you start (`create_item`
   with `type: "ticket"`, body from `assets/ticket-template.md`). New tickets
   belong in the board's first configured stage (leave `status` unset —
   `create_item` defaults to it) — filing a ticket isn't the same as starting
   it, so if the user only asked you to file one, create it and stop there.
   Set `area` and `priority` from step 1's ids; if the board has no areas
   defined yet, omit `area` rather than inventing one. Labels are free-form —
   use them only where the project already has a convention.
3. **Move through the stages as you work.** Call `move_item` at each real
   transition, choosing the id from the `list_board` list you fetched in step 1
   by what it *means*, not by matching one of the names below literally:
   designing the approach, writing code, awaiting the user's eyes, verifying
   with tests or checks, finished. On a fresh board that's `planning` →
   `implementing` → `review` → `verifying` → `done`; on an older board it's
   commonly just `in-progress` → `review` → `done`. If no configured stage
   clearly matches what you're doing, ask rather than inventing one — an
   invented id is rejected outright. The human reads these transitions to know
   where you are, so move as you go rather than batching at the end — and
   don't mark something done that you haven't actually checked.
4. **Plans coordinate tickets.** For multi-ticket work, create the tickets
   first and then the plan (`assets/plan-template.md`) with their real ids in
   its table — that order saves you rewriting the plan body afterwards. The
   plan's Tickets table carries the `[[TICK-00X]]` links, so the relation is
   already recorded — do **not** also add `links: ["PLAN-00X"]` to each
   ticket; `get_links` on a ticket shows its plan as a backlink for free.
   Note that `update_item` replaces the whole `body`, so a late edit means
   re-sending it in full.
5. **Research feeds decisions.** Findings worth keeping outlive the
   conversation, so put them in a research note
   (`assets/research-template.md`), linked from the ticket or plan that
   prompted it. An open question with no findings yet isn't a research note —
   it belongs in a plan's Risks section.
6. **Link once, in one direction.** Backlinks are derived, so linking A→B is
   enough; `get_links` shows both sides. Use `links` at create time where you
   can, `link_items` for relations you discover later, and `[[ID]]` inside a
   body for inline references while writing prose.
7. **Archive, don't delete.** `update_item` with `archived: true` hides an item
   from the board but keeps it recoverable. `delete_item` is permanent —
   reserve it for items the user explicitly wants gone.

Plans and research notes carry a status like anything else, but they aren't
worked through the stages the way tickets are. Leave them in the board's first
stage unless the user wants them tracked on the board.

## Conventions that keep the board useful

- Titles are imperative and specific: "Wire retry logic into upload queue", not
  "Fix bug". The board is read at a glance, so the title carries the meaning.
- Bodies say *why* and *how to verify*, not just *what*. Drop template sections
  that genuinely don't apply; `## Notes` in particular starts empty and fills up
  as you work.
- Priority, roughly: `urgent` is blocking someone right now, `high` is this
  week, `medium` is normal, `low` is nice-to-have. If the user's wording is
  genuinely ambiguous, ask instead of guessing.
- If the board's stages don't fit the work, ask before restructuring —
  `add_column` changes the board for everyone who looks at it. It's also
  append-only (rejects a duplicate id, can't remove/rename/reorder), so it can
  add a missing stage but can't replace the existing set — a genuine
  restructure needs the Kanmer app's Settings editor.

For exact tool parameters and what each field means, read
`references/tool-reference.md`.
