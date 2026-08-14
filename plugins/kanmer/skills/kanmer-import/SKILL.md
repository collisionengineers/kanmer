---
name: kanmer-import
description: Bring external work onto a Kanmer board — turn GitHub issues and PR review comments into tickets in the right area, each linked back to its source, idempotently (re-running updates instead of duplicating). Use when the user says "import the GitHub issues", "put this issue on the board", "turn the PR feedback into tickets", "sync the board with the issue tracker". DO NOT USE FOR first-time board setup and seeding from the codebase itself (kanmer-setup) or writing the review feedback yourself (kanmer-review).
---

# Importing external work onto the board

The board is only trustworthy if it shows *all* the work — including the
work that arrives in GitHub instead of in conversation. Importing is a
mapping job with one hard rule: **idempotent**. Every imported ticket
carries its source URL in the body, and the import checks for that URL
before creating anything, so running twice changes nothing the second time.

## GitHub issues

1. **Fetch**: `gh issue list --state open --json
   number,title,body,labels,url` (add `--label`/`--search` filters when the
   user scopes the import).
2. **Dedupe**: for each issue, `search_items` for its URL (and for close
   title matches — a human may have filed the same work by hand). Found →
   update that ticket if the issue changed materially; skip otherwise.
3. **Map**: pick the `area` from the issue's labels and the files/components
   it names, against `list_board`'s areas; issue labels worth keeping become
   ticket labels, plus `gh-import`. Priority only when the issue clearly
   signals one.
4. **Create** via `kanmer-tickets` conventions (`create_items` for bulk,
   check per-entry results): title stays imperative (rewrite the issue title
   if it's a complaint, not an instruction), body carries the What/Why
   distilled from the issue plus a `Source: <url>` line. Leave `status`
   unset. Issues referencing each other become `links` / `rel: "blocks"`.

## PR review comments

Feedback on a PR you're tracking: each substantive comment becomes a ticket
in the **PR Review** area (they get the `PR-` prefix), body quoting the
comment with its URL, linked `rel: "blocks"` to the ticket the PR belongs to
(the `Kanmer: <ID>` footer in the PR body names it). This is the same rule
`kanmer-review` applies — use whichever skill is already in play; the
tickets come out identical.

## Report

Created / updated / skipped-as-duplicate, one line each with `[[ID]]` ↔
source URL. If the user wants the reverse link, add a "Tracked on the
Kanmer board as <ID>" comment to the issue (`gh issue comment`) — ask, don't
spam their tracker unprompted.
