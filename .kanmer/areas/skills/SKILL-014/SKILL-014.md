---
id: SKILL-014
type: ticket
title: Give every skill an explicit numbered workflow and correct hand-offs
status: done
area: skills
order: 1190
assignee: claude-code
profile: feature
stageEntered:
  preparing: '2026-08-16T19:13:06.795Z'
  review: '2026-08-16T19:28:07.637Z'
  verifying: '2026-08-16T19:29:38.262Z'
  done: '2026-08-16T19:31:21.184Z'
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
  - 74e76a6
  - fc52cba
prs:
  - '#34'
archived: false
created: '2026-08-16T18:25:18.654Z'
updated: '2026-08-16T23:19:36.377Z'
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

- [x] Every SKILL.md has an ordered workflow and a closing hand-off — successor
      for pipeline skills, caller-and-return for service skills.
- [x] The AGENTS block carries the pipeline order; `verify:agents-block` passes.
- [x] `grep` still finds zero hardcoded gate rules in any skill (FRD-023
      acceptance) — the workflow must not smuggle them back in.
- [x] Every doc type named anywhere under `plugins/kanmer/skills/` appears in
      `packages/core/src/profiles.ts`.
- [x] No skill routes to a skill that does not exist.

---

**Correction, from the audit (`research`).** When filed, this ticket claimed
`kanmer-import` was "still routed to". That is **false** — it came from reading
the stale install at `.claude/skills/`, not the tracked source.
`grep -rn "kanmer-import" plugins/kanmer/skills/` returns nothing; FRD-013's
removal is complete. The claim is withdrawn, and the "no skill routes to a skill
that does not exist" box stays as a check rather than a fix.

## Outcome

Shipped as PR [#34](https://github.com/collisionengineers/kanmer/pull/34), merge
commit `fc52cba`. 18 files, prose only — no `packages/` source, so the MCP bundle
is byte-identical and test counts are unchanged (core 182, GUI 202).

**Two things shipped differently than planned:**

1. **"Every skill names its successor" is not literal.** Service skills
   (`tickets`, `docs`, `report`) name their *callers and where control returns*;
   `closeout` says the pipeline ends. Reasoned in `open-questions` rather than
   quietly redefined.
2. **The AGENTS block got a route line, not a routing table.** The block ships
   into every repo that installs Kanmer, and a twelve-row table restating what
   the skills already hold is what FRD-023 R1 exists to prevent.

**Scope grew, deliberately.** The `impact` sweep the ticket asked for was four
sites; the audit found the real seam is `tool-reference.md`, whose tool *table*
had been maintained while the prose beneath it drifted through two format
migrations — `priority` (removed by ADR-0006), the seven v2 stages as a
configurable default, "format-2 boards", documents as flat files. All swept.

**Two corrections to statements that were measurably false.** `kanmer-review`
claimed `enter-review`/`enter-done` stop a question raised during implementation.
`fix` and `chore` declare no `enter-review`, and the merge is unprotected on
*every* profile — this skill merges before it moves, and `gh pr merge` is outside
the gate engine. `kanmer-auto` said the same and was corrected with it. FRD-023
R1's grep therefore came out **net-negative**: 8 boundary mentions before, 5
after.

**A defect this ticket introduced, caught by its own review.** The new
ticket-folder diagram drew scratch as a root-level file and used an ellipsis for
the report's filename. Fixed in `74e76a6`; the root cause — writing the diagram
from `profiles.ts` instead of from `ls` of a real ticket — is recorded in `proof`
because it is the exact defect class this ticket exists to remove.

**Follow-ups:** [[SKILL-015]] (four `pr-*.md` assets describe documents
`set_ticket_doc` now rejects). The parked question — that nothing in the rail
asserts skill vocabulary, so this drift can recur tomorrow — is evidence for
[[CORE-025]], not a competing design.
