---
id: CORE-023
type: ticket
title: 'Detect when a repo''s Kanmer is older than the agent''s, and say what is stale'
status: verifying
area: core
assignee: claude-code
profile: feature
stageEntered:
  preparing: '2026-08-16T21:51:29.664Z'
  review: '2026-08-16T23:44:41.961Z'
  verifying: '2026-08-16T23:54:38.413Z'
taken_at: '2026-08-16T23:25:23.323Z'
branch: core-023-detect-stale-repo
worktree: .worktrees/core-023
labels: []
groups:
  - HZN-003
links: []
refs:
  - docs/functional/frd/FRD-013-setup-as-reconciliation.md
  - docs/architecture/adr/ADR-0008-single-format-3-migration.md
  - docs/architecture/adr/ADR-0013-staleness-by-content-not-version.md
commits:
  - 61d058c
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/54'
archived: false
created: '2026-08-16T18:25:18.669Z'
updated: '2026-08-16T23:58:27.832Z'
---

## What

A reliable way to tell whether a repo's Kanmer artefacts match the version of
Kanmer the agent is running — and, where they do not, what specifically is
stale.

## Why

`.kanmer/version.json` records the **storage format** (currently 3), not the
product version. Migration moves ticket structure. But a repo carries far more
than ticket structure, and none of it migrates:

- the installed **skills** (`.claude/skills/`, `.agents/skills/`, …) — copies
  made at install time
- the **AGENTS.md managed block** — a literal that only changes when rewritten
- the committed **`kanmer-mcp.cjs`** bundle, if installed from a plugin fetch
- `board.yml` **profiles**, which is why [[SKILL-012]] had to inject
  `questions-resolved` at resolve time rather than rely on shipped defaults
- provider **MCP registrations** written by Connect

So a repo set up on 0.3.2 keeps 0.3.2's skills and AGENTS block indefinitely,
while the agent talks to a newer server. This repo is a live example: its
`.claude/skills/` is a **v2-era** install — still shipping `impact-template.md`
and `kanmer-import` — and reading it caused a wrong analysis earlier today.

## Approach

- Enumerate what a repo carries that is version-sensitive, and for each: is it
  migrated, reconciled by setup, or neither? The "neither" list is the answer to
  the question this ticket asks.
- Decide what "version" even means here — product version, a manifest of
  artefact versions, or content hashes. Hashes survive a user editing a skill;
  a version string does not.
- Surface the answer somewhere an agent will see it: `get_status` is the
  orientation call and the natural home.
- Reconciliation (FRD-013) is the repair path; this ticket is the detection.

## Verification

- [ ] `get_status` (or equivalent) reports staleness against a repo set up on an
      older Kanmer, naming which artefacts are behind.
- [ ] A repo that is current reports clean — no false positives from a user's
      own edits.
- [ ] The list of not-covered-by-migration artefacts is written down, not
      implied.

## Outcome
