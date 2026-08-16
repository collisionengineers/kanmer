---
id: SKILL-014
type: ticket
title: Give every skill an explicit numbered workflow and correct hand-offs
status: done
area: skills
assignee: claude-code
profile: feature
stageEntered:
  preparing: '2026-08-16T19:13:06.795Z'
  review: '2026-08-16T19:28:07.637Z'
  verifying: '2026-08-16T19:29:38.262Z'
  done: '2026-08-16T19:31:21.184Z'
taken_at: '2026-08-16T19:18:34.989Z'
branch: skill-014-workflows
worktree: .worktrees/skill-014
labels: []
groups:
  - HZN-003
links:
  - SKILL-013
refs:
  - docs/functional/frd/FRD-023-agent-skills-system.md
  - docs/architecture/adr/ADR-0009-skills-are-not-the-contract.md
commits:
  - bc3b201
prs:
  - '#34'
archived: false
created: '2026-08-16T18:25:18.654Z'
updated: '2026-08-16T19:31:21.184Z'
---

## What

Every `SKILL.md` should carry an explicit ordered workflow — step 1, 2, 3 — that
names the stage it operates in and the skill it hands off to. The same routing
information belongs in the AGENTS.md managed block.

**Also in scope: sweep the format-2 vocabulary out of the skill assets.** The
`SKILL.md` prose was migrated to format 3; the assets and references beneath it
were not.

## Why

The skills already describe their work, but the *sequence* and the hand-off are
uneven: some end by naming the next skill, some do not, and none states the full
path. An agent that loads one skill mid-task has no reliable way to know what
precedes or follows it — and skills are loaded on demand, so that is the normal
case rather than the exception (ADR-0009).

The risk this addresses is concrete: a phase run out of order, or a stage moved
without the skill that owns it ever running.

The stale vocabulary is the same failure in a different place. A workflow that
routes correctly is worth nothing if the template it routes to names a document
that cannot exist. Found by running `kanmer-setup` as reconciliation on this
repo, 2026-08-16.

## Approach

- Audit all twelve skills for: a numbered workflow, the stage each step operates
  in, and an explicit "hand off to X" ending.
- Normalise the shape without flattening each skill's own voice — FRD-023 R3 is
  deliberate that questioning prose is per-skill, and the same applies here.
- **Do not restate gate rules** (FRD-023 R1). A workflow says "then `kanmer-plan`
  writes plan and checklist"; it does not say which boundary needs what. That
  stays `get_doc_gates`.
- Put the pipeline **order** in the AGENTS block so it is in context without
  loading any skill — remembering that both copies of `BLOCK_BODY` must change
  together.
- **Sweep `impact` → `files`** (format 3 renamed the type; `profiles.ts` has no
  `impact`), and the rest of the format-2 vocabulary the audit found with it.

## Verification

- [ ] Every SKILL.md has an ordered workflow and a closing hand-off — successor
      for pipeline skills, caller-and-return for service skills.
- [ ] The AGENTS block carries the pipeline order; `verify:agents-block` passes.
- [ ] `grep` still finds zero hardcoded gate rules in any skill (FRD-023
      acceptance) — the workflow must not smuggle them back in.
- [ ] Every doc type named anywhere under `plugins/kanmer/skills/` appears in
      `packages/core/src/profiles.ts`.
- [ ] No skill routes to a skill that does not exist.

---

**Correction, from the audit (`research`).** When filed, this ticket claimed
`kanmer-import` was "still routed to". That is **false** — it came from reading
the stale install at `.claude/skills/`, not the tracked source.
`grep -rn "kanmer-import" plugins/kanmer/skills/` returns nothing; FRD-013's
removal is complete. The claim is withdrawn, and the "no skill routes to a skill
that does not exist" box stays as a check rather than a fix.

## Outcome
