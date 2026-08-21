---
id: CORE-029
type: ticket
title: AGENTS.md §4 still documents v2's seven stages and configurable gates
status: done
area: core
order: 1170
assignee: codex-mcp-client
profile: chore
stageEntered:
  preparing: '2026-08-20T21:30:14.232Z'
  implementing: '2026-08-20T21:31:13.334Z'
  review: '2026-08-20T21:32:39.025Z'
  verifying: '2026-08-20T21:34:17.026Z'
  done: '2026-08-20T21:34:36.991Z'
labels:
  - docs
groups:
  - HZN-006
links:
  - SKILL-013
docs_todo: true
commits:
  - a5f56b37f6034e57cafeb13eee686eed6231732b
  - 4a63c7ce25bda4cae52b8935b0ae0f05747094c2
prs:
  - '71'
archived: false
created: '2026-08-17T00:13:55.000Z'
updated: '2026-08-21T13:02:17.326Z'
---

## What

`AGENTS.md` §4 ("Data model") still describes the **v2** stage model, in the
repo's own hand-written prose — *outside* the `kanmer:instructions` managed
block, which is why every check that exists today looks straight past it.

At `AGENTS.md:280-284`:

> `status` is the only workflow axis, with **seven default stages**:
> ```
> backlog → researching → planning → implementing → review → verifying → done
> ```

Format 3 has **six fixed stages** (ADR-0002): backlog → preparing →
implementing → review → verifying → done. `researching` and `planning` were
merged into Preparing, and stages are constants rather than board configuration.

Nearby in the same passage:

- "The final stage's configured document-gate boundary is re-checked whenever a
  board write changes which stage is last (`assertFinalStageGates`)" — the last
  stage is a constant now, so a board write cannot change it.
- "the LAST stage is governed by the resolved configured document gates" — gates
  come from **profiles**, not from stage configuration.

## Why

`AGENTS.md` is tier 3 of ADR-0009's contract hierarchy: always in context, read
by every agent that opens the repo. A stale stage list there is the same defect
class [[SKILL-013]] fixed one tier down in skill prose — and worse in one way,
because an agent reading "seven stages" will look for stages the engine rejects
at write time.

The same passage was checked by [[SKILL-014]] and [[SKILL-013]]: both scoped
their checks to `plugins/kanmer/skills/`, so `verify-skill-prose.mjs` check 2
("`researching`/`planning` never name a stage") would catch this text
immediately — it simply never looks at this file. That is the cheap fix.

## Approach

- Correct §4: six fixed stages, stages-are-constants, gates-come-from-profiles.
  Check the surrounding paragraphs too; `assertFinalStageGates` and "configured
  document gates" are from the same era.
- Point `verify-skill-prose.mjs` check 2 at `AGENTS.md` as well as the skills
  tree. It is one path in an array, and it is the only reason this survived two
  tickets aimed at exactly this kind of staleness.

## Notes

Found during [[SKILL-013]]'s verify, by a proof assertion that scanned for v2
markers and hit one outside the managed block. Not fixed there: that PR had
merged, and §4 is not the managed block or skill prose it owned.
