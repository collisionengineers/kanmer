# Ticket body template

Use this structure for `create_item` bodies with `type: "ticket"`. Keep
sections that apply; drop ones that don't. Frontmatter fields (title, status,
area, priority, labels, links) are tool parameters, not body content.

---

## What

One or two sentences: the concrete change or outcome this ticket delivers.

## Why

The problem or need driving it. Link context inline: see [[RES-003]]. (Don't
add a `[[PLAN-…]]` link back to the covering plan — the plan's Tickets table
already links plan → ticket, and that one direction is enough; `get_links`
shows the plan as a derived backlink.)

## Approach

- Bullet steps or key decisions. Short — the ticket is a work item, not a design doc.

## Verification

- [ ] How to check this is done (command, test, observable behaviour).

## Notes

Anything discovered while working: gotchas, follow-ups spun off, links to commits/PRs.
