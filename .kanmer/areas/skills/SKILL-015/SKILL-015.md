---
id: SKILL-015
type: ticket
title: Delete the four pr-* review assets
status: review
area: skills
assignee: codex-mcp-client
profile: chore
stageEntered:
  preparing: '2026-08-20T21:25:25.179Z'
  implementing: '2026-08-20T21:26:15.756Z'
  review: '2026-08-20T21:27:15.086Z'
taken_at: '2026-08-20T21:26:15.772Z'
branch: skill-015-remove-review-assets
worktree: .worktrees/skill-015
labels: []
groups:
  - HZN-006
links:
  - SKILL-014
refs:
  - docs/functional/frd/FRD-023-agent-skills-system.md
commits:
  - b341a4cd9861765ecb7771b1db2665a8482b0dc6
prs:
  - '70'
archived: false
created: '2026-08-16T19:17:13.249Z'
updated: '2026-08-20T21:27:15.086Z'
---

_Owner decision 2026-08-20: delete per FRD-023 R1 — review lives in scratch/review.md, not standalone pr-* assets._

## What

`plugins/kanmer/skills/kanmer-review/assets/` holds four templates —
`pr-changes-summary.md`, `pr-comments.md`, `pr-comment-disposition.md`,
`pr-review.md` — for documents that no longer exist. Decide whether to delete
them or rewrite them as scratch templates, and do it.

## Why

Reviews stopped being pipeline documents. `kanmer-review/SKILL.md:24-31` is
explicit: the legal document types are fixed (research, files, plan, checklist,
open-questions, post-implementation-report, proof), `set_ticket_doc` **rejects**
anything else, and the review goes to `append_scratch` instead.

So an agent that follows these assets writes four documents the tool refuses.
They are not stale wording — they are assets for a mechanism that was removed.

Found during [[SKILL-014]]'s audit and deliberately left out of it: that ticket
normalises workflows and sweeps format-2 vocabulary, and quietly deleting four
files under cover of a wording sweep would hide a real decision.

## Approach

Two honest options, and the choice is the work:

- **Delete them.** `SKILL.md:31-38` already lists the four things a scratch
  review must cover, in order. The assets add nothing the skill does not say.
- **Rewrite them as one scratch template.** If the four headings are worth
  handing an agent as a fill-in shape, they belong in a single
  `assets/review-scratch.md` matching what `append_scratch` actually produces —
  not four files named after dead document types.

Lean toward deletion: FRD-023 R1 is derive-don't-restate, and four templates
restating a four-item list in the skill above them is the restatement it warns
about.

Note [[SKILL-014]] fixes the one `impact` line in `pr-review.md` so its sweep
verifies cleanly. That is not a reason to keep the file.

## Verification

- [ ] No asset under `kanmer-review/` names a document type absent from
      `packages/core/src/profiles.ts`.
- [ ] Whatever remains is reachable from `kanmer-review/SKILL.md` — no orphan
      assets shipped in the bundle.
- [ ] `plugin:build` + `plugin:check` pass with the bundle rebuilt at the repo
      root.

## Outcome
