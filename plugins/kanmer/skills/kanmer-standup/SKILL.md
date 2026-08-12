---
name: kanmer-standup
description: Summarise the current state of a project's Kanmer board — what's in progress, what's blocked or stale, what changed recently. Use whenever the user asks for a standup, status update, board summary, progress report, "where are we", "what's left", or wants to groom/triage the backlog in a project with a .kanmer folder.
---

# Kanmer standup / board report

Produce a status report from the live board, not from memory of the
conversation — the human or another agent may have changed items since, and
confidently reporting stale state is worse than not reporting.

## Gather

1. `list_board` for the stage and area names, so you can report human-readable
   names rather than ids. Its `statuses` list defines **which report sections
   exist and what belongs in each**, not just their display names — a
   customised or pre-existing board rarely has the six defaults below, so
   never assume it does.
2. `list_items` for all active items. Summaries include `updated`, which is what
   staleness is judged from (an ISO timestamp in the item's frontmatter, moved
   only by real changes — not a file mtime).
3. `get_item` on anything that looks stale, blocked or surprising, so you
   describe its actual state rather than inferring from the title.
4. Only if you intend to report link-based flags (plans whose tickets are all
   done, research nothing points at): `get_links` on those plans and notes.
   Skip this if you're just giving a quick status.

If `list_items` comes back empty, don't report a default board as though it were
configured — say the board has no items yet, mention that the stages shown are
defaults, and stop.

## Report format

Use the structure below, but **only the sections that have something in them**.
Omitting empty sections matters: the value of this report is that the user reads
it in fifteen seconds and knows where to look, and a skeleton of "none" headings
buries that.

The stage sections describe **tickets**. Plans and research notes park in the
board's first stage by convention rather than being worked through the stages,
so they aren't "up next" — surface them only where they need attention (see
Flags).

**Map the board's stages to sections by position and role, not by matching ids
against the six defaults** — a customised or pre-existing board (e.g. one still
using a single `in-progress` stage) must map cleanly too:

- the **first** stage in `list_board` → **Up next**;
- the **last** stage → **Recently done**;
- a stage whose id or name reads as review/approval (e.g. `review`,
  `in-review`, "Needs review") → **In review**;
- **every other stage** (everything between the first and last stage, minus
  the review stage) → **In flight**;
- a stage the board defines but that currently has no tickets contributes
  nothing — the omit-empty-sections rule above already covers it, so don't
  invent a placeholder for it.

A ticket whose `status` is not in the board's `statuses` list at all (this can
happen if a column was removed while items still referenced it) belongs in
**Flags** as an "off-board stage", not silently in one of the sections above —
that's the signal the human needs to see, not something to guess a bucket for.

### Board: <project folder name>

**In flight** — tickets in the working stages between the first and last stage,
excluding the review stage (which has its own section below). One line each:
`ID title (stage, area, priority)` — drop the area slot if the ticket has none —
plus a few words of real state. Mark anything whose `updated` is more than 7
days old as *stale*.

**In review** — tickets in the review stage and who they're waiting on: the
`assignee` if set, otherwise say it's unassigned.

**Up next** — the tickets at the top of the board's first stage, highest
priority first. 3–5 max.

**Recently done** — items in the board's last stage whose `updated` falls in the
last 7 days. Give a count plus the highlights, not the full list.

**Flags** — anything needing the user: stale items, tickets with no area,
tickets whose `status` isn't one of the board's configured stages, plans whose
tickets are all done (suggest closing), research nothing links to.

Keep it scannable — one line per item, and no quoting bodies unless asked.

## Grooming (only when asked)

If the user asks to groom or triage, propose the batch first — archive stale
done items, fill in missing areas or priorities, reprioritise — and only then
apply the approved subset with `update_item` / `move_item`. Board changes are
visible to everyone looking at it, so a silent bulk edit is disorienting.
