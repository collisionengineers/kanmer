---
id: SKILL-014
type: ticket
title: Give every skill an explicit numbered workflow and correct hand-offs
status: backlog
area: skills
assignee: ''
profile: feature
labels: []
groups:
  - HZN-003
links:
  - SKILL-013
refs:
  - docs/functional/frd/FRD-023-agent-skills-system.md
  - docs/architecture/adr/ADR-0009-skills-are-not-the-contract.md
archived: false
created: '2026-08-16T18:25:18.654Z'
updated: '2026-08-16T18:26:23.130Z'
---

## What

Every `SKILL.md` should carry an explicit ordered workflow — step 1, 2, 3 — that
names the stage it operates in and the skill it hands off to. The same routing
summary belongs in the AGENTS.md managed block.

## Why

The skills already describe their work, but the *sequence* and the hand-off are
uneven: some end by naming the next skill, some do not, and none states the full
path. An agent that loads one skill mid-task has no reliable way to know what
precedes or follows it — and skills are loaded on demand, so that is the normal
case rather than the exception (ADR-0009).

The risk this addresses is concrete: a phase run out of order, or a stage moved
without the skill that owns it ever running.

## Approach

- Audit all twelve skills for: a numbered workflow, the stage each step operates
  in, and an explicit "hand off to X" ending.
- Normalise the shape without flattening each skill's own voice — FRD-023 R3 is
  deliberate that questioning prose is per-skill, and the same applies here.
- **Do not restate gate rules** (FRD-023 R1). A workflow says "then `kanmer-plan`
  writes plan and checklist"; it does not say which boundary needs what. That
  stays `get_doc_gates`.
- Put the routing table in the AGENTS block so it is in context without loading
  any skill — remembering that both copies of `BLOCK_BODY` must change together.

## Verification

- [ ] Every SKILL.md has a numbered workflow and names its successor.
- [ ] The AGENTS block carries the routing summary; `verify:agents-block` passes.
- [ ] `grep` still finds zero hardcoded gate rules in any skill (FRD-023
      acceptance) — the workflow must not smuggle them back in.

## Outcome
